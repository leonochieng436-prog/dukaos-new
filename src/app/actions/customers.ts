"use server";

import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import type { Prisma } from "@prisma/client";
import { requireAuthContext, assertPermission, AuthError } from "@/server/auth/context";
import { increaseStock } from "@/server/services/inventory";
import { recordAudit } from "@/server/services/audit";
import { customerSchema, customerPaymentSchema, returnSchema } from "@/lib/validation/customers";
import { allocatePaymentToSales } from "@/lib/credit";
import type { ActionResult } from "./auth";

async function reconcileSettledCreditSale(
  tx: any,
  saleId: string,
  actualMethod: string,
  actualAmount: string,
  reference?: string | null,
) {
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    include: { payments: true },
  });

  if (!sale) return;

  const total = new Decimal(sale.total.toString());
  const paid = new Decimal(sale.amountPaid.toString());

  if (paid.lessThan(total)) return;

  const existingCreditPayment = sale.payments.find((payment: { method: string }) => payment.method === "CREDIT");
  const paymentMethod = actualMethod.toUpperCase();
  const previousMetadata = existingCreditPayment?.metadata && typeof existingCreditPayment.metadata === "object" && !Array.isArray(existingCreditPayment.metadata)
    ? existingCreditPayment.metadata as Record<string, unknown>
    : {};

  if (existingCreditPayment) {
    await tx.payment.update({
      where: { id: existingCreditPayment.id },
      data: {
        method: paymentMethod as any,
        amount: actualAmount,
        status: "CONFIRMED",
        providerRef: reference || existingCreditPayment.providerRef,
        metadata: {
          ...previousMetadata,
          settledAs: paymentMethod,
          settledReference: reference || null,
          settlementAmount: actualAmount,
        },
      },
    });
    await tx.sale.update({
      where: { id: saleId },
      data: { isCreditSale: false },
    });
    return;
  }

  await tx.payment.create({
    data: {
      organizationId: sale.organizationId,
      saleId: sale.id,
      method: paymentMethod as any,
      amount: actualAmount,
      status: "CONFIRMED",
      providerRef: reference || null,
      metadata: {
        settledAs: paymentMethod,
        settledReference: reference || null,
        settlementAmount: actualAmount,
      },
    },
  });

  await tx.sale.update({
    where: { id: saleId },
    data: { isCreditSale: false },
  });
}

export async function createCustomer(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext(); assertPermission(ctx, "CUSTOMERS_MANAGE");
    const parsed = customerSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid customer." };
    const input = parsed.data;
    const customer = await ctx.db.customer.create({ data: { organizationId: ctx.organizationId, name: input.name, phone: input.phone || null, email: input.email || null, address: input.address || null, category: input.category, creditLimit: input.creditLimit, notes: input.notes || null } });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "CUSTOMER_CREATED", entityType: "Customer", entityId: customer.id, metadata: { name: customer.name } });
    revalidatePath("/dashboard/customers"); return { ok: true, data: { id: customer.id } };
  } catch (e) { if (e instanceof AuthError) return { ok: false, error: e.message }; throw e; }
}

export async function clearCustomerBalance(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext(); assertPermission(ctx, "CUSTOMER_CREDIT_MANAGE");
    const data = raw instanceof FormData ? Object.fromEntries(raw.entries()) : raw;
    const customerId = typeof data === "object" && data && "customerId" in data ? String(data.customerId ?? "") : "";
    const method = typeof data === "object" && data && "method" in data ? String(data.method ?? "cash") : "cash";
    const reference = typeof data === "object" && data && "reference" in data ? String(data.reference ?? "") : "";
    const amount = typeof data === "object" && data && "amount" in data ? String(data.amount ?? "") : "";
    const splitMethod = typeof data === "object" && data && "splitMethod" in data ? String(data.splitMethod ?? "") : "";
    const splitAmount = typeof data === "object" && data && "splitAmount" in data ? String(data.splitAmount ?? "") : "";

    if (!customerId) return { ok: false, error: "Select a customer to clear." };

    const customer = await ctx.db.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { ok: false, error: "Customer not found." };

    const creditSales = await ctx.db.sale.findMany({
      where: { customerId: customer.id, isCreditSale: true, status: "COMPLETED" },
      select: { id: true, total: true, amountPaid: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const balance = creditSales.reduce((sum, sale) => sum.plus(sale.total.toString()).minus(sale.amountPaid.toString()), new Decimal(0));

    if (balance.lte(0)) return { ok: false, error: "This customer already has no outstanding balance." };

    // Determine payment amount: use provided amount or full balance
    const paymentAmount = amount ? new Decimal(amount) : balance;
    if (paymentAmount.gt(balance)) return { ok: false, error: "Payment amount exceeds outstanding balance." };

    const selectedMethod = ["cash", "mpesa", "bank", "card", "other"].includes(method) ? method : "cash";
    const selectedSplitMethod = splitMethod && ["cash", "mpesa", "bank", "card", "other"].includes(splitMethod) ? splitMethod : null;

    // Handle split payment
    let firstMethodAmount = paymentAmount;
    let secondMethodAmount = new Decimal(0);

    if (selectedSplitMethod && splitAmount) {
      const splitAmountDecimal = new Decimal(splitAmount);
      if (splitAmountDecimal.plus(new Decimal(firstMethodAmount)).gt(paymentAmount)) {
        return { ok: false, error: "Split amounts exceed the total payment amount." };
      }
      firstMethodAmount = paymentAmount.minus(splitAmountDecimal);
      secondMethodAmount = splitAmountDecimal;
    }

    const allocations = allocatePaymentToSales({
      sales: creditSales.map((sale) => ({
        id: sale.id,
        total: sale.total.toString(),
        amountPaid: sale.amountPaid.toString(),
      })),
      paymentAmount: paymentAmount.toFixed(2),
    });

    await ctx.db.$transaction(async (tx) => {
      for (const allocation of allocations) {
        const sale = creditSales.find((entry) => entry.id === allocation.saleId);
        if (!sale) continue;

        let currentMethod = selectedMethod;
        let currentAmount = new Decimal(allocation.amount);

        // Split allocation between methods if split payment is enabled
        if (selectedSplitMethod && secondMethodAmount.gt(0)) {
          const allocatedAmount = new Decimal(allocation.amount);

          // First portion with first method
          if (firstMethodAmount.gt(0)) {
            const firstPortionAmount = Decimal.min(allocatedAmount, firstMethodAmount);
            const nextAmountPaid = new Decimal(sale.amountPaid.toString()).plus(firstPortionAmount);
            await tx.sale.update({ where: { id: sale.id }, data: { amountPaid: nextAmountPaid.toFixed(2) } });
            await tx.customerPayment.create({
              data: {
                organizationId: ctx.organizationId,
                customerId: customer.id,
                saleId: sale.id,
                amount: firstPortionAmount.toFixed(2),
                method: selectedMethod,
                reference: reference || "Balance cleared (payment 1/2)",
                receivedById: ctx.userId,
              },
            });

            if (nextAmountPaid.greaterThanOrEqualTo(new Decimal(sale.total.toString()))) {
              await reconcileSettledCreditSale(
                tx,
                sale.id,
                selectedMethod,
                firstPortionAmount.toFixed(2),
                reference || "Balance cleared (payment 1/2)",
              );
            }
            firstMethodAmount = firstMethodAmount.minus(firstPortionAmount);
          }

          // Second portion with second method
          const secondPortionAmount = allocatedAmount.minus(firstMethodAmount.gt(0) ? Decimal.min(allocatedAmount, firstMethodAmount) : new Decimal(0));
          if (secondPortionAmount.gt(0) && secondMethodAmount.gt(0)) {
            const nextAmountPaid = new Decimal(sale.amountPaid.toString()).plus(secondPortionAmount);
            await tx.sale.update({ where: { id: sale.id }, data: { amountPaid: nextAmountPaid.toFixed(2) } });
            await tx.customerPayment.create({
              data: {
                organizationId: ctx.organizationId,
                customerId: customer.id,
                saleId: sale.id,
                amount: secondPortionAmount.toFixed(2),
                method: selectedSplitMethod,
                reference: reference || "Balance cleared (payment 2/2)",
                receivedById: ctx.userId,
              },
            });

            if (nextAmountPaid.greaterThanOrEqualTo(new Decimal(sale.total.toString()))) {
              await reconcileSettledCreditSale(
                tx,
                sale.id,
                selectedSplitMethod,
                secondPortionAmount.toFixed(2),
                reference || "Balance cleared (payment 2/2)",
              );
            }
            secondMethodAmount = secondMethodAmount.minus(secondPortionAmount);
          }
        } else {
          // Single payment method
          const nextAmountPaid = new Decimal(sale.amountPaid.toString()).plus(new Decimal(allocation.amount));
          await tx.sale.update({ where: { id: sale.id }, data: { amountPaid: nextAmountPaid.toFixed(2) } });
          await tx.customerPayment.create({
            data: {
              organizationId: ctx.organizationId,
              customerId: customer.id,
              saleId: sale.id,
              amount: allocation.amount,
              method: selectedMethod,
              reference: reference || "Balance cleared",
              receivedById: ctx.userId,
            },
          });

          if (nextAmountPaid.greaterThanOrEqualTo(new Decimal(sale.total.toString()))) {
            await reconcileSettledCreditSale(
              tx,
              sale.id,
              selectedMethod,
              allocation.amount,
              reference || "Balance cleared",
            );
          }
        }
      }

      if (allocations.length === 0) {
        await tx.customerPayment.create({
          data: {
            organizationId: ctx.organizationId,
            customerId: customer.id,
            amount: paymentAmount.toFixed(2),
            method: selectedMethod,
            reference: reference || "Balance cleared",
            receivedById: ctx.userId,
          },
        });
      }
    });

    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "CUSTOMER_CREDIT_CLEARED", entityType: "Customer", entityId: customer.id, metadata: { clearedAmount: paymentAmount.toFixed(2), splitPayment: selectedSplitMethod ? true : false } });
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/credit");
    revalidatePath("/dashboard/pos");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (e) { if (e instanceof AuthError) return { ok: false, error: e.message }; return { ok: false, error: e instanceof Error ? e.message : "Could not clear the customer balance." }; }
}

export async function recordCustomerPayment(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext(); assertPermission(ctx, "CUSTOMER_CREDIT_MANAGE");
    const parsed = customerPaymentSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment." };
    const input = parsed.data; const customer = await ctx.db.customer.findFirst({ where: { id: input.customerId } });
    if (!customer) return { ok: false, error: "Customer not found." };
    const creditSales = await ctx.db.sale.findMany({ where: { customerId: customer.id, isCreditSale: true, status: "COMPLETED" }, select: { id: true, total: true, amountPaid: true, createdAt: true }, orderBy: { createdAt: "asc" } });
    const balance = creditSales.reduce((sum, sale) => sum.plus(sale.total.toString()).minus(sale.amountPaid.toString()), new Decimal(0));
    const amount = new Decimal(input.amount); if (amount.greaterThan(balance)) return { ok: false, error: "Payment cannot exceed the outstanding balance." };

    const allocations = allocatePaymentToSales({
      sales: creditSales.map((sale) => ({
        id: sale.id,
        total: sale.total.toString(),
        amountPaid: sale.amountPaid.toString(),
      })),
      paymentAmount: input.amount,
    });

    await ctx.db.$transaction(async (tx) => {
      for (const allocation of allocations) {
        const sale = creditSales.find((entry) => entry.id === allocation.saleId);
        if (!sale) continue;
        const nextAmountPaid = new Decimal(sale.amountPaid.toString()).plus(new Decimal(allocation.amount));
        await tx.sale.update({ where: { id: sale.id }, data: { amountPaid: nextAmountPaid.toFixed(2) } });
        await tx.customerPayment.create({ data: { organizationId: ctx.organizationId, customerId: customer.id, saleId: sale.id, amount: allocation.amount, method: input.method, reference: input.reference || null, receivedById: ctx.userId } });

        if (nextAmountPaid.greaterThanOrEqualTo(new Decimal(sale.total.toString()))) {
          await reconcileSettledCreditSale(
            tx,
            sale.id,
            input.method,
            allocation.amount,
            input.reference || null,
          );
        }
      }
    });

    revalidatePath("/dashboard/customers"); revalidatePath("/dashboard/credit"); return { ok: true, data: undefined };
  } catch (e) { if (e instanceof AuthError) return { ok: false, error: e.message }; throw e; }
}

export async function createSaleReturn(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext(); assertPermission(ctx, "SALES_REFUND");
    const parsed = returnSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: "Add at least one returned item." };
    const input = parsed.data; const sale = await ctx.db.sale.findFirst({ where: { id: input.saleId, organizationId: ctx.organizationId, status: "COMPLETED" }, include: { items: true } });
    if (!sale) return { ok: false, error: "Completed sale not found." };
    const warehouse = await ctx.db.warehouse.findFirst({ where: { branchId: sale.branchId, isActive: true } }); if (!warehouse) return { ok: false, error: "No active warehouse for this branch." };
    await ctx.db.$transaction(async (tx) => {
      let refund = new Decimal(0);
      const returnItems = [];
      for (const inputItem of input.items) {
        const saleItem = sale.items.find((item) => item.id === inputItem.saleItemId); if (!saleItem) throw new Error("Sale item not found.");
        const quantity = new Decimal(inputItem.quantity); if (quantity.greaterThan(saleItem.quantity.toString())) throw new Error("Return quantity exceeds the sold quantity.");
        const amount = quantity.times(saleItem.unitPrice.toString()); refund = refund.plus(amount); returnItems.push({ saleItemId: saleItem.id, quantity: quantity.toString(), refundAmount: amount.toFixed(2) });
        await increaseStock(tx as unknown as Prisma.TransactionClient, { organizationId: ctx.organizationId, warehouseId: warehouse.id, variantId: saleItem.variantId, quantity, unitCost: saleItem.unitCost, type: "SALE_RETURN", referenceType: "SaleReturn", referenceId: input.saleId, createdById: ctx.userId });
      }
      await tx.saleReturn.create({ data: { organizationId: ctx.organizationId, saleId: sale.id, customerId: sale.customerId, status: "COMPLETED", reason: input.reason || null, refundMethod: input.refundMethod, refundAmount: refund.toFixed(2), requestedById: ctx.userId, approvedById: ctx.userId, items: { create: returnItems } } });
    });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "SALE_RETURNED", entityType: "Sale", entityId: sale.id, metadata: { itemCount: input.items.length } });
    revalidatePath("/dashboard/pos"); revalidatePath("/dashboard/inventory"); revalidatePath("/dashboard/customers"); return { ok: true, data: undefined };
  } catch (e) { if (e instanceof AuthError) return { ok: false, error: e.message }; return { ok: false, error: e instanceof Error ? e.message : "Could not process return." }; }
}
