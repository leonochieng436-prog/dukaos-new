"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwner, assertPermission, requireAuthContext, AuthError } from "@/server/auth/context";
import { recordAudit } from "@/server/services/audit";
import { encryptMpesaSecret } from "@/server/services/mpesa/encryption";
import { testDarajaConnection } from "@/server/services/mpesa/daraja";
import type { ActionResult } from "./auth";

const configurationSchema = z.object({
  accountId: z.string().optional().or(z.literal("")),
  branchId: z.string().optional().or(z.literal("")),
  displayName: z.string().trim().min(2).max(80),
  accountType: z.enum(["TILL", "PAYBILL"]),
  shortcode: z.string().trim().regex(/^\\d{5,7}$/),
  environment: z.enum(["SANDBOX", "PRODUCTION"]),
  consumerKey: z.string().trim().min(1).max(300),
  consumerSecret: z.string().trim().min(1).max(300),
  passkey: z.string().trim().min(1).max(300),
  testConnection: z.boolean().default(true),
});

export async function saveMpesaConfiguration(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "SETTINGS_MANAGE");
    assertOwner(ctx);
    const parsed = configurationSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Enter valid M-Pesa account details." };
    const input = parsed.data;
    if (input.branchId && !ctx.branchIds?.includes(input.branchId) && ctx.branchIds !== null) return { ok: false, error: "You do not have access to this branch." };
    const accountData = {
      organizationId: ctx.organizationId,
      branchId: input.branchId || null,
      provider: "MPESA",
      accountType: input.accountType,
      displayName: input.displayName,
      shortcode: input.shortcode,
      consumerKeyEncrypted: encryptMpesaSecret(input.consumerKey),
      consumerSecretEncrypted: encryptMpesaSecret(input.consumerSecret),
      passkeyEncrypted: encryptMpesaSecret(input.passkey),
      environment: input.environment,
      status: input.testConnection ? "PENDING" as const : "NOT_CONFIGURED" as const,
      isActive: false,
      isDefault: true,
      lastError: null,
    };
    const account = input.accountId
      ? await ctx.db.paymentAccount.update({ where: { id: input.accountId }, data: accountData })
      : await ctx.db.paymentAccount.create({ data: accountData });
    if (input.testConnection) {
      try {
        await testDarajaConnection({ ...account, environment: account.environment });
      } catch (error) {
        await ctx.db.paymentAccount.update({ where: { id: account.id }, data: { status: "FAILED", lastError: error instanceof Error ? error.message : "Connection test failed." } });
        return { ok: false, error: error instanceof Error ? error.message : "M-Pesa connection test failed." };
      }
      await ctx.db.paymentAccount.update({ where: { id: account.id }, data: { status: "ACTIVE", isActive: true, lastTestedAt: new Date(), lastError: null } });
    }
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "MPESA_CONFIGURATION_UPDATED", entityType: "PaymentAccount", entityId: account.id, metadata: { accountType: input.accountType, environment: input.environment, branchId: input.branchId || null } });
    revalidatePath("/dashboard/settings");
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, error: error.message };
    return { ok: false, error: error instanceof Error ? error.message : "Could not save M-Pesa configuration." };
  }
}
