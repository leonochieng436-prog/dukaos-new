"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthContext, assertPermission, assertOwner, AuthError } from "@/server/auth/context";
import { hashPassword } from "@/server/auth/password";
import { recordAudit } from "@/server/services/audit";
import { assertBranchLimitNotExceeded } from "@/server/services/billing";
import { createBranchSchema } from "@/lib/validation/auth";
import type { ActionResult } from "./auth";

const registerSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
});

export async function createRegister(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "BRANCHES_MANAGE");
    assertOwner(ctx);
    await assertBranchLimitNotExceeded(ctx);
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Enter a register name and branch." };
    const branch = await ctx.db.branch.findFirst({ where: { id: parsed.data.branchId, isActive: true } });
    if (!branch) return { ok: false, error: "Branch not found." };
    const existing = await ctx.db.register.findFirst({ where: { branchId: branch.id, name: parsed.data.name } });
    if (existing) return { ok: false, error: "A register with this name already exists at this branch." };
    const register = await ctx.db.register.create({ data: { branchId: branch.id, name: parsed.data.name } });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "REGISTER_CREATED", entityType: "Register", entityId: register.id, metadata: { branchId: branch.id, name: register.name } });
    revalidatePath("/dashboard/settings/registers");
    revalidatePath("/dashboard/settings/branches");
    return { ok: true, data: { id: register.id } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function upsertRegisterCredential(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "BRANCHES_MANAGE");
    assertOwner(ctx);
    const parsed = z.object({
      registerId: z.string().min(1),
      terminalCode: z.string().trim().min(3).max(40),
      terminalPassword: z.string().max(120).optional().or(z.literal("")),
      enabled: z.boolean().optional(),
    }).safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Enter a valid terminal code." };
    }
    const input = parsed.data;
    const register = await ctx.db.register.findFirst({ where: { id: input.registerId, branch: { organizationId: ctx.organizationId }, isActive: true } });
    if (!register) return { ok: false, error: "Register not found." };
    const existingCredential = await ctx.db.registerCredential.findUnique({ where: { registerId: register.id } });
    if (!existingCredential && !input.terminalPassword?.trim()) {
      return { ok: false, error: "Set a terminal password for this register." };
    }
    const shouldRequireTerminalLogin = input.enabled ?? (Boolean(input.terminalCode.trim()) || Boolean(input.terminalPassword?.trim()));
    const nextPasswordHash = input.terminalPassword && input.terminalPassword.trim().length >= 8
      ? await hashPassword(input.terminalPassword)
      : existingCredential?.passwordHash ?? await hashPassword("change-me-please");
    const credential = await ctx.db.registerCredential.upsert({
      where: { registerId: register.id },
      create: { registerId: register.id, terminalCode: input.terminalCode, passwordHash: nextPasswordHash, isActive: shouldRequireTerminalLogin },
      update: { terminalCode: input.terminalCode, passwordHash: nextPasswordHash, isActive: shouldRequireTerminalLogin },
    });
    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "REGISTER_CREDENTIAL_UPDATED",
      entityType: "RegisterCredential",
      entityId: credential.id,
      metadata: { registerId: register.id, terminalCode: input.terminalCode, enabled: input.enabled ?? true },
    });
    revalidatePath("/dashboard/settings/branches");
    revalidatePath("/dashboard/pos");
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function createBranch(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "BRANCHES_MANAGE");
    assertOwner(ctx);

    const parsed = createBranchSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }
    const input = parsed.data;

    const existing = await ctx.db.branch.findFirst({
      where: { code: input.code.toUpperCase() },
    });
    if (existing) {
      return {
        ok: false,
        error: "A branch with this code already exists.",
        fieldErrors: { code: ["Already in use"] },
      };
    }

    const branch = await ctx.db.branch.create({
      data: {
        organizationId: ctx.organizationId,
        name: input.name,
        code: input.code.toUpperCase(),
        address: input.address || null,
        phone: input.phone || null,
      },
    });

    // Every new branch gets a default warehouse and POS register so it's
    // immediately usable — an empty branch with nowhere to hold stock or
    // ring up a sale isn't a complete feature.
    const warehouse = await ctx.db.warehouse.create({
      data: {
        branchId: branch.id,
        organizationId: ctx.organizationId,
        name: `${branch.name} Warehouse`,
        isDefault: true,
      },
    });

    await ctx.db.register.create({
      data: { branchId: branch.id, name: "Register 1" },
    });

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "BRANCH_CREATED",
      entityType: "Branch",
      entityId: branch.id,
      metadata: { name: branch.name, code: branch.code, warehouseId: warehouse.id },
    });

    revalidatePath("/dashboard/settings/branches");
    return { ok: true, data: { id: branch.id } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function updateBranch(branchId: string, raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "BRANCHES_MANAGE");
    assertOwner(ctx);
    const parsed = createBranchSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Please fix the branch details." };
    const input = parsed.data;
    const existing = await ctx.db.branch.findFirst({ where: { code: input.code.toUpperCase() } });
    if (existing && existing.id !== branchId) return { ok: false, error: "A branch with this code already exists." };
    await ctx.db.branch.update({ where: { id: branchId }, data: { name: input.name, code: input.code.toUpperCase(), address: input.address || null, phone: input.phone || null } });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "BRANCH_UPDATED", entityType: "Branch", entityId: branchId, metadata: { name: input.name, code: input.code.toUpperCase() } });
    revalidatePath("/dashboard/settings/branches");
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function deactivateBranch(branchId: string): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "BRANCHES_MANAGE");
    assertOwner(ctx);
    const branch = await ctx.db.branch.findFirst({ where: { id: branchId } });
    if (!branch) return { ok: false, error: "Branch not found." };
    await ctx.db.branch.update({ where: { id: branchId }, data: { isActive: false } });
    await ctx.db.warehouse.updateMany({ where: { branchId }, data: { isActive: false } });
    await ctx.db.register.updateMany({ where: { branchId }, data: { isActive: false } });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "BRANCH_DEACTIVATED", entityType: "Branch", entityId: branchId });
    revalidatePath("/dashboard/settings/branches");
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function deactivateWarehouse(warehouseId: string): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "BRANCHES_MANAGE");
    assertOwner(ctx);
    const warehouse = await ctx.db.warehouse.findFirst({ where: { id: warehouseId }, select: { id: true, branchId: true } });
    if (!warehouse) return { ok: false, error: "Warehouse not found." };
    await ctx.db.warehouse.update({ where: { id: warehouse.id }, data: { isActive: false } });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "WAREHOUSE_DEACTIVATED", entityType: "Warehouse", entityId: warehouse.id });
    revalidatePath("/dashboard/settings/branches");
    revalidatePath("/dashboard/settings");
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function deactivateRegister(registerId: string): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "BRANCHES_MANAGE");
    assertOwner(ctx);
    const register = await ctx.db.register.findFirst({ where: { id: registerId, branch: { organizationId: ctx.organizationId } }, select: { id: true } });
    if (!register) return { ok: false, error: "Register not found." };
    const openSession = await ctx.db.cashSession.findFirst({ where: { registerId: register.id, status: "OPEN" } });
    if (openSession) return { ok: false, error: "Close the open cash session before deleting this register." };
    await ctx.db.register.update({ where: { id: register.id }, data: { isActive: false } });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "REGISTER_DEACTIVATED", entityType: "Register", entityId: register.id });
    revalidatePath("/dashboard/settings/branches");
    revalidatePath("/dashboard/settings");
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}
