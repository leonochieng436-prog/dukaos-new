"use server";

import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import type { Prisma } from "@prisma/client";
import { requireAuthContext, assertPermission, assertBranchAccess, AuthError } from "@/server/auth/context";
import { decreaseStock, increaseStock } from "@/server/services/inventory";
import { recordAudit } from "@/server/services/audit";
import { saleSchema, cashSessionSchema, closeCashSessionSchema } from "@/lib/validation/sales";
import { z } from "zod";
import type { ActionResult } from "./auth";
import { getRegisterSummary } from "@/server/services/register-summary";
import { matchesRegisterCredential } from "@/lib/register-credentials";
import { validateSalePayments } from "@/lib/sales";

export async function openCashSession(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext(); assertPermission(ctx, "CASH_SESSION_OPEN");
    const parsed = cashSessionSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: "Enter a valid opening balance." };
    const input = parsed.data; assertBranchAccess(ctx, input.branchId);
    const register = await ctx.db.register.findFirst({ where: { id: input.registerId, branchId: input.branchId, branch: { organizationId: ctx.organizationId }, isActive: true }, include: { branch: true, credentials: true } });
    if (!register) return { ok: false, error: "Register not found for this branch." };
    const requiredCredential = register.credentials?.isActive ? register.credentials : null;
    if (requiredCredential && !ctx.isOwner) {
      if (!input.terminalCode || !input.terminalPassword) return { ok: false, error: "This register requires its terminal code and password." };
      const matches = await matchesRegisterCredential(input.terminalCode, input.terminalPassword, requiredCredential.terminalCode, requiredCredential.passwordHash);
      if (!matches) return { ok: false, error: "Invalid register terminal credentials." };
    }
    const existingUserSession = await ctx.db.cashSession.findFirst({ where: { userId: ctx.userId, status: "OPEN" } });
    if (existingUserSession && existingUserSession.registerId !== register.id) return { ok: false, error: "Close your current register session before opening another one." };
    const open = await ctx.db.cashSession.findFirst({ where: { registerId: register.id, status: "OPEN" } });
    if (open) return { ok: false, error: `Register ${register.name} is already open in ${register.branch.name}.` };
    await ctx.db.cashSession.create({ data: { organizationId: ctx.organizationId, branchId: input.branchId, registerId: register.id, userId: ctx.userId, openingBalance: input.openingBalance } });
    revalidatePath("/dashboard/pos"); return { ok: true, data: undefined };
  } catch (e) { if (e instanceof AuthError) return { ok: false, error: e.message }; throw e; }
}

export async function createSale(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext(); assertPermission(ctx, "SALES_CREATE");
    const parsed = saleSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: "Add products and choose a payment method.", fieldErrors: parsed.error.flatten().fieldErrors };
    const input = parsed.data; assertBranchAccess(ctx, input.branchId);
    const payments = input.payments?.length ? input.payments : [{ method: input.paymentMethod, amount: input.amountPaid }];
    const cashPaid = payments.filter((payment) => payment.method !== "CREDIT").reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
    if (payments.some((payment) => payment.method === "CREDIT") && !input.customerId) return { ok: false, error: "Select a customer for credit sales." };
    const branch = await ctx.db.branch.findFirst({ where: { id: input.branchId, isActive: true } });
    const register = await ctx.db.register.findFirst({ where: { id: input.registerId, branchId: input.branchId, branch: { organizationId: ctx.organizationId }, isActive: true }, include: { branch: true } });
    const warehouse = await ctx.db.warehouse.findFirst({ where: { id: input.warehouseId, branchId: input.branchId, isActive: true } });
    if (!branch || !register || !warehouse) return { ok: false, error: "Branch, register, or warehouse not found." };
    if (input.customerId && !(await ctx.db.customer.findFirst({ where: { id: input.customerId, organizationId: ctx.organizationId } }))) return { ok: false, error: "Customer not found." };
    const variants = await ctx.db.productVariant.findMany({ where: { id: { in: input.items.map((item) => item.variantId) }, isActive: true, product: { isActive: true, organizationId: ctx.organizationId } }, include: { product: true } });
    if (variants.length !== input.items.length) return { ok: false, error: "One or more products were not found." };
    const lines = input.items.map((item) => { const variant = variants.find((candidate) => candidate.id === item.variantId)!; const quantity = new Decimal(item.quantity); const price = new Decimal(variant.sellingPrice.toString()); return { ...item, quantity, price, total: quantity.times(price), variant }; });
    const subtotal = lines.reduce((sum, line) => sum.plus(line.total), new Decimal(0));
    const finalPaymentValidation = validateSalePayments({ total: subtotal.toFixed(2), paymentMethod: input.paymentMethod, payments });
    if (!finalPaymentValidation.ok) return { ok: false, error: finalPaymentValidation.error };
    const sale = await ctx.db.$transaction(async (tx) => {
      let cogs = new Decimal(0);
      const saleItems = [];
      for (const line of lines) {
        const consumed = await decreaseStock(tx as unknown as Prisma.TransactionClient, { organizationId: ctx.organizationId, warehouseId: warehouse.id, variantId: line.variantId, quantity: line.quantity, type: "SALE", referenceType: "Sale", createdById: ctx.userId });
        const unitCost = consumed.totalConsumed.isZero() ? new Decimal(0) : consumed.totalCost.div(consumed.totalConsumed);
        cogs = cogs.plus(consumed.totalCost);
        saleItems.push({ variantId: line.variantId, productNameSnapshot: line.variant.product.name, variantNameSnapshot: line.variant.name, skuSnapshot: line.variant.sku, quantity: line.quantity.toString(), unitPrice: line.price.toString(), unitCost: unitCost.toString(), total: line.total.toString() });
      }
      if (input.customerId && payments.some((payment) => payment.method === "CREDIT")) {
        const customer = await tx.customer.findFirst({ where: { id: input.customerId, organizationId: ctx.organizationId } });
        if (!customer) throw new Error("Customer not found.");
      }
      const session = await tx.cashSession.findFirst({ where: { registerId: register.id, branchId: branch.id, organizationId: ctx.organizationId, status: "OPEN" } });
      if (!session) throw new Error("Open the register before completing a sale.");
      if (session.userId !== ctx.userId) throw new Error("This register session is assigned to another cashier.");
      const created = await tx.sale.create({ data: { organizationId: ctx.organizationId, branchId: branch.id, registerId: register.id, cashierId: ctx.userId, cashSessionId: session?.id, receiptNumber: `R-${Date.now()}`, subtotal: subtotal.toFixed(2), total: subtotal.toFixed(2), cogsTotal: cogs.toFixed(2), amountPaid: cashPaid.toFixed(2), changeGiven: Decimal.max(cashPaid.minus(subtotal), 0).toFixed(2), isCreditSale: payments.some((payment) => payment.method === "CREDIT"), customerId: input.customerId || null, items: { create: saleItems }, payments: { create: payments.map((payment) => ({ organizationId: ctx.organizationId, method: payment.method, amount: payment.amount })) } } });
      if (session && cashPaid.gt(0)) await tx.cashMovement.create({ data: { cashSessionId: session.id, type: "SALE", amount: cashPaid.toFixed(2), referenceType: "Sale", referenceId: created.id } });
      return created;
    }, { maxWait: 20000, timeout: 60000 });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "SALE_CREATED", entityType: "Sale", entityId: sale.id, metadata: { total: subtotal.toFixed(2) } });
    revalidatePath("/dashboard/pos"); revalidatePath("/dashboard"); revalidatePath("/dashboard/reports"); revalidatePath("/dashboard/inventory"); return { ok: true, data: { id: sale.id } };
  } catch (e) { if (e instanceof AuthError) return { ok: false, error: e.message }; return { ok: false, error: e instanceof Error ? e.message : "Could not complete sale." }; }
}

export async function closeCashSession(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext(); assertPermission(ctx, "CASH_SESSION_CLOSE");
    const parsed = closeCashSessionSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: "Enter the actual cash balance." };
    const input = parsed.data; const session = await ctx.db.cashSession.findFirst({ where: { id: input.sessionId, organizationId: ctx.organizationId, status: "OPEN" } });
    if (!session) return { ok: false, error: "Open cash session not found." };
    if (ctx.branchIds && !ctx.branchIds.includes(session.branchId)) return { ok: false, error: "You do not have access to this register." };
    if (session.userId !== ctx.userId && !ctx.permissions.has("CASH_SESSION_VIEW_ALL")) return { ok: false, error: "You are not authorized to close this register session." };
    const summary = await getRegisterSummary(ctx.db, session.id);
    if (!summary) return { ok: false, error: "Open cash session not found." };
    const expected = new Decimal(summary.expectedCash);
    const actual = new Decimal(input.actualBalance);
    const cashRemoved = new Decimal(input.cashRemoved);
    const variance = actual.minus(expected);
    if (summary.heldSales > 0) return { ok: false, error: `Resolve ${summary.heldSales} held sale${summary.heldSales === 1 ? "" : "s"} before closing this register.` };
    if (cashRemoved.greaterThan(actual)) return { ok: false, error: "Cash removed cannot exceed counted cash." };
    if (!variance.isZero() && !input.varianceReason?.trim()) return { ok: false, error: "Explain the cash variance before closing." };
    await ctx.db.$transaction(async (tx) => {
      await tx.cashSession.update({ where: { id: session.id, status: "OPEN" }, data: { status: "CLOSED", expectedBalance: expected.toFixed(2), actualBalance: actual.toFixed(2), variance: variance.toFixed(2), cashRemoved: cashRemoved.toFixed(2), closingFloat: actual.minus(cashRemoved).toFixed(2), varianceReason: input.varianceReason?.trim() || null, closingNote: input.closingNote?.trim() || null, denominationCounts: input.denominationCounts ?? undefined, closedAt: new Date() } });
      if (cashRemoved.gt(0)) await tx.cashMovement.create({ data: { cashSessionId: session.id, type: "WITHDRAWAL", amount: cashRemoved.toFixed(2), note: "Cash removed during register closing" } });
    });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "CASH_SESSION_CLOSED", entityType: "CashSession", entityId: session.id, metadata: { expectedCash: expected.toFixed(2), actualCash: actual.toFixed(2), variance: variance.toFixed(2), cashRemoved: cashRemoved.toFixed(2), varianceReason: input.varianceReason || null } });
    revalidatePath("/dashboard/pos"); revalidatePath("/dashboard"); revalidatePath("/dashboard/reports"); return { ok: true, data: undefined };
  } catch (e) { if (e instanceof AuthError) return { ok: false, error: e.message }; throw e; }
}

export async function correctSale(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "SALES_VIEW");

    const normalizeStringArray = (value: unknown): string[] => {
      if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map(String);
      if (typeof value === "string") return [value];
      return [];
    };

    const payload = raw instanceof FormData ? Object.fromEntries(raw.entries()) : raw;
    const parsed = z.object({
      saleId: z.string().min(1),
      total: z.string().min(1).refine((value) => Number(value) >= 0).optional().or(z.literal("")),
      amountPaid: z.string().min(1).refine((value) => Number(value) >= 0).optional().or(z.literal("")),
      paymentMethod: z.enum(["CASH", "MPESA", "CARD", "BANK_TRANSFER", "CREDIT", "OTHER"]).optional(),
      reason: z.string().min(1).max(80),
      note: z.string().max(300).optional().or(z.literal("")),
      removeItemIds: z.preprocess((value) => normalizeStringArray(value), z.array(z.string())).optional(),
    }).safeParse(payload);
    if (!parsed.success) return { ok: false, error: "Enter a valid correction reason and amounts." };

    const input = parsed.data;
    const sale = await ctx.db.sale.findFirst({
      where: { id: input.saleId, organizationId: ctx.organizationId, status: "COMPLETED" },
      include: { items: true, payments: true },
    });
    if (!sale) return { ok: false, error: "Sale not found." };

    const originalSnapshot = {
      subtotal: sale.subtotal.toString(),
      total: sale.total.toString(),
      amountPaid: sale.amountPaid.toString(),
      changeGiven: sale.changeGiven.toString(),
      paymentMethod: sale.payments[0]?.method ?? "CASH",
      itemIds: sale.items.map((item) => item.id),
    };

    const removeIds = new Set(input.removeItemIds ?? []);
    const removedItems = sale.items.filter((item) => removeIds.has(item.id));
    const remainingItems = sale.items.filter((item) => !removeIds.has(item.id));
    const removedTotal = removedItems.reduce((sum, item) => sum.plus(item.total.toString()), new Decimal(0));
    const removedCostTotal = removedItems.reduce((sum, item) => sum.plus(new Decimal(item.unitCost.toString()).times(new Decimal(item.quantity.toString()))), new Decimal(0));
    const nextSubtotal = remainingItems.reduce((sum, item) => sum.plus(item.total.toString()), new Decimal(0));
    const proposedTotal = new Decimal(input.total && input.total !== "" ? input.total : nextSubtotal.toString());
    const proposedPaid = new Decimal(input.amountPaid && input.amountPaid !== "" ? input.amountPaid : sale.amountPaid.toString());
    const paymentMethod = input.paymentMethod ?? sale.payments[0]?.method ?? "CASH";
    const changeGiven = Decimal.max(proposedPaid.minus(proposedTotal), new Decimal(0));
    const correctionNote = [
      `Correction approved: ${input.reason}`,
      input.note?.trim() ? `Notes: ${input.note.trim()}` : null,
      `Original total: ${originalSnapshot.total}`,
      `Proposed total: ${proposedTotal.toFixed(2)}`,
      `Removed items: ${removedItems.map((item) => item.id).join(", ") || "none"}`,
      `Original payment: ${originalSnapshot.paymentMethod}`,
      `Proposed payment: ${paymentMethod}`,
    ].filter(Boolean).join(" | ");

    await ctx.db.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findFirst({ where: { branchId: sale.branchId, isActive: true } });
      if (!warehouse && removedItems.length > 0) throw new Error("No active warehouse found for this branch.");

      if (removedItems.length > 0) {
        for (const item of removedItems) {
          await increaseStock(tx as unknown as Prisma.TransactionClient, {
            organizationId: ctx.organizationId,
            warehouseId: warehouse!.id,
            variantId: item.variantId,
            quantity: new Decimal(item.quantity.toString()),
            unitCost: item.unitCost,
            type: "ADJUSTMENT",
            referenceType: "SaleCorrection",
            referenceId: sale.id,
            createdById: ctx.userId,
          });
        }
        await tx.saleItem.deleteMany({ where: { id: { in: removedItems.map((item) => item.id) } } });
      }

      const nextCogs = new Decimal(sale.cogsTotal.toString()).minus(removedCostTotal);
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          subtotal: proposedTotal.toFixed(2),
          total: proposedTotal.toFixed(2),
          amountPaid: proposedPaid.toFixed(2),
          changeGiven: changeGiven.toFixed(2),
          cogsTotal: nextCogs.gt(0) ? nextCogs.toFixed(2) : "0.00",
          isCreditSale: paymentMethod === "CREDIT",
          notes: sale.notes ? `${sale.notes}\n${correctionNote}` : correctionNote,
        },
      });

      if (sale.cashSessionId && paymentMethod !== "CASH") {
        await tx.cashMovement.deleteMany({ where: { referenceType: "Sale", referenceId: sale.id } });
      }

      if (sale.cashSessionId && paymentMethod === "CASH") {
        const cashInflow = Decimal.max(proposedPaid.minus(changeGiven), new Decimal(0));
        await tx.cashMovement.updateMany({
          where: { referenceType: "Sale", referenceId: sale.id },
          data: { amount: cashInflow.toFixed(2) },
        });
      }

      if (sale.payments.length > 0) {
        await tx.payment.deleteMany({ where: { saleId: sale.id } });
      }

      await tx.payment.create({
        data: {
          organizationId: ctx.organizationId,
          saleId: sale.id,
          method: paymentMethod,
          amount: proposedPaid.toFixed(2),
          status: "CONFIRMED",
        },
      });
    });

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "SALE_CORRECTION_APPLIED",
      entityType: "Sale",
      entityId: sale.id,
      metadata: {
        originalSnapshot,
        correctedSnapshot: {
          subtotal: proposedTotal.toFixed(2),
          total: proposedTotal.toFixed(2),
          amountPaid: proposedPaid.toFixed(2),
          changeGiven: changeGiven.toFixed(2),
          paymentMethod,
          removedItemIds: removedItems.map((item) => item.id),
          reason: input.reason,
        },
      },
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/pos");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: sale.id } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "Could not correct sale." };
  }
}

export async function refundSale(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "SALES_REFUND");
    const parsed = z.object({
      saleId: z.string().min(1),
      reason: z.string().max(200).optional().or(z.literal("")),
      refundMethod: z.enum(["cash", "store_credit", "original_payment_method"]).default("original_payment_method"),
      note: z.string().max(300).optional().or(z.literal("")),
    }).safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Select a valid refund reason." };

    const input = parsed.data;
    const sale = await ctx.db.sale.findFirst({
      where: { id: input.saleId, organizationId: ctx.organizationId, status: "COMPLETED" },
      include: { items: true },
    });
    if (!sale) return { ok: false, error: "Completed sale not found." };

    const warehouse = await ctx.db.warehouse.findFirst({ where: { branchId: sale.branchId, isActive: true } });
    if (!warehouse) return { ok: false, error: "No active warehouse found for this branch." };

    const refundAmount = new Decimal(sale.total.toString());

    await ctx.db.$transaction(async (tx) => {
      for (const item of sale.items) {
        await increaseStock(tx as unknown as Prisma.TransactionClient, {
          organizationId: ctx.organizationId,
          warehouseId: warehouse.id,
          variantId: item.variantId,
          quantity: new Decimal(item.quantity.toString()),
          unitCost: item.unitCost,
          type: "SALE_RETURN",
          referenceType: "SaleRefund",
          referenceId: sale.id,
          createdById: ctx.userId,
        });
      }

      await tx.saleReturn.create({
        data: {
          organizationId: ctx.organizationId,
          saleId: sale.id,
          customerId: sale.customerId,
          status: "COMPLETED",
          reason: input.reason || null,
          refundMethod: input.refundMethod,
          refundAmount: refundAmount.toFixed(2),
          requestedById: ctx.userId,
          approvedById: ctx.userId,
          items: {
            create: sale.items.map((item) => ({
              saleItemId: item.id,
              quantity: item.quantity.toString(),
              refundAmount: item.total.toString(),
            })),
          },
        },
      });

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: "RETURNED",
          notes: sale.notes ? `${sale.notes}\nRefund processed: ${input.reason || "sale refunded"}${input.note ? ` | ${input.note}` : ""}` : `Refund processed: ${input.reason || "sale refunded"}${input.note ? ` | ${input.note}` : ""}`,
        },
      });
    });

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "SALE_REFUNDED",
      entityType: "Sale",
      entityId: sale.id,
      metadata: { refundAmount: refundAmount.toFixed(2), method: input.refundMethod, reason: input.reason || null },
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/pos");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/customers");
    return { ok: true, data: { id: sale.id } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "Could not refund sale." };
  }
}

export async function voidSale(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "SALES_VOID");
    const parsed = z.object({
      saleId: z.string().min(1),
      reason: z.string().min(1).max(200),
      note: z.string().max(300).optional().or(z.literal("")),
    }).safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Provide a valid void reason." };

    const input = parsed.data;
    const sale = await ctx.db.sale.findFirst({
      where: { id: input.saleId, organizationId: ctx.organizationId, status: "COMPLETED" },
      include: { items: true },
    });
    if (!sale) return { ok: false, error: "Completed sale not found." };

    const warehouse = await ctx.db.warehouse.findFirst({ where: { branchId: sale.branchId, isActive: true } });
    if (!warehouse) return { ok: false, error: "No active warehouse found for this branch." };

    await ctx.db.$transaction(async (tx) => {
      for (const item of sale.items) {
        await increaseStock(tx as unknown as Prisma.TransactionClient, {
          organizationId: ctx.organizationId,
          warehouseId: warehouse.id,
          variantId: item.variantId,
          quantity: new Decimal(item.quantity.toString()),
          unitCost: item.unitCost,
          type: "ADJUSTMENT",
          referenceType: "SaleVoid",
          referenceId: sale.id,
          createdById: ctx.userId,
        });
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: "VOIDED",
          voidedById: ctx.userId,
          voidedAt: new Date(),
          voidReason: input.reason,
          notes: sale.notes ? `${sale.notes}\nSale voided: ${input.reason}${input.note ? ` | ${input.note}` : ""}` : `Sale voided: ${input.reason}${input.note ? ` | ${input.note}` : ""}`,
        },
      });
    });

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "SALE_VOIDED",
      entityType: "Sale",
      entityId: sale.id,
      metadata: { reason: input.reason },
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/pos");
    revalidatePath("/dashboard/inventory");
    return { ok: true, data: { id: sale.id } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "Could not void sale." };
  }
}

export async function updateReceiptNotes(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "SALES_VIEW");
    const parsed = z.object({ saleId: z.string().min(1), notes: z.string().max(300) }).safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Receipt note is too long." };
    const sale = await ctx.db.sale.findFirst({ where: { id: parsed.data.saleId, organizationId: ctx.organizationId, status: "COMPLETED" } });
    if (!sale) return { ok: false, error: "Receipt not found." };
    await ctx.db.sale.update({ where: { id: sale.id }, data: { notes: parsed.data.notes || null } });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "RECEIPT_NOTE_UPDATED", entityType: "Sale", entityId: sale.id });
    revalidatePath("/dashboard/pos"); revalidatePath(`/dashboard/pos/receipts/${sale.id}`);
    return { ok: true, data: undefined };
  } catch (e) { if (e instanceof AuthError) return { ok: false, error: e.message }; throw e; }
}
