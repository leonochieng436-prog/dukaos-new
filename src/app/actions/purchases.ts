"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { requireAuthContext, assertPermission, assertBranchAccess, AuthError } from "@/server/auth/context";
import { recordAudit } from "@/server/services/audit";
import { increaseStock } from "@/server/services/inventory";
import { assertFeature } from "@/server/services/billing";
import { supplierSchema, purchaseOrderSchema, receivePurchaseSchema, supplierInvoiceSchema, supplierPaymentSchema, directPurchaseSchema, purchasePaymentSchema } from "@/lib/validation/purchases";
import type { ActionResult } from "./auth";

export async function createSupplier(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    await assertFeature(ctx, "purchases");
    assertPermission(ctx, "SUPPLIERS_MANAGE");
    const parsed = supplierSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid supplier." };
    const input = parsed.data;
    const supplier = await ctx.db.supplier.create({
      data: {
        organizationId: ctx.organizationId,
        name: input.name,
        companyName: input.companyName || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        taxPin: input.taxPin || null,
        paymentTerms: input.paymentTerms || null,
        notes: input.notes || null,
      },
    });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "SUPPLIER_CREATED", entityType: "Supplier", entityId: supplier.id, metadata: { name: supplier.name } });
    revalidatePath("/dashboard/purchases");
    return { ok: true, data: { id: supplier.id } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function createPurchaseOrder(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    await assertFeature(ctx, "purchases");
    assertPermission(ctx, "PURCHASE_CREATE");
    const parsed = purchaseOrderSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Please fix the purchase order.", fieldErrors: parsed.error.flatten().fieldErrors };
    const input = parsed.data;
    const branch = await ctx.db.branch.findFirst({ where: { id: input.branchId, isActive: true } });
    if (!branch) return { ok: false, error: "Branch not found." };
    assertBranchAccess(ctx, branch.id);
    const warehouse = await ctx.db.warehouse.findFirst({ where: { id: input.warehouseId, branchId: branch.id, isActive: true } });
    if (!warehouse) return { ok: false, error: "Warehouse does not belong to the selected branch." };
    const supplier = await ctx.db.supplier.findFirst({ where: { id: input.supplierId, isActive: true } });
    if (!supplier) return { ok: false, error: "Supplier not found." };
    const variants = await ctx.db.productVariant.findMany({ where: { id: { in: input.items.map((item) => item.variantId) }, isActive: true, product: { isActive: true, organizationId: ctx.organizationId } } });
    if (variants.length !== input.items.length) return { ok: false, error: "One or more products were not found." };

    const totals = input.items.reduce((sum, item) => sum.plus(new Decimal(item.quantity).times(item.unitCost)), new Decimal(0));
    const po = await ctx.db.purchaseOrder.create({
      data: {
        organizationId: ctx.organizationId,
        branchId: branch.id,
        warehouseId: warehouse.id,
        supplierId: supplier.id,
        poNumber: `PO-${Date.now()}`,
        subtotal: totals.toFixed(2),
        total: totals.toFixed(2),
        createdById: ctx.userId,
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
        items: { create: input.items.map((item) => ({ variantId: item.variantId, quantityOrdered: item.quantity, unitCost: item.unitCost, total: new Decimal(item.quantity).times(item.unitCost).toFixed(2) })) },
      },
    });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "PURCHASE_ORDER_CREATED", entityType: "PurchaseOrder", entityId: po.id, metadata: { poNumber: po.poNumber, total: totals.toFixed(2) } });
    revalidatePath("/dashboard/purchases");
    return { ok: true, data: { id: po.id } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function createDirectPurchase(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    await assertFeature(ctx, "purchases");
    assertPermission(ctx, "PURCHASE_CREATE");
    const parsed = directPurchaseSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Please fix the purchase details.", fieldErrors: parsed.error.flatten().fieldErrors };
    const input = parsed.data;
    const branch = await ctx.db.branch.findFirst({ where: { id: input.branchId, isActive: true } });
    if (!branch) return { ok: false, error: "Branch not found." };
    assertBranchAccess(ctx, branch.id);
    const warehouse = await ctx.db.warehouse.findFirst({ where: { id: input.warehouseId, branchId: branch.id, isActive: true } });
    if (!warehouse) return { ok: false, error: "Warehouse does not belong to the selected branch." };
    const supplier = await ctx.db.supplier.findFirst({ where: { id: input.supplierId, isActive: true } });
    if (!supplier) return { ok: false, error: "Supplier not found." };
    const variants = await ctx.db.productVariant.findMany({ where: { id: { in: input.items.map((item) => item.variantId) }, isActive: true, product: { isActive: true, organizationId: ctx.organizationId } } });
    if (variants.length !== input.items.length) return { ok: false, error: "One or more products were not found." };
    const subtotal = input.items.reduce((sum, item) => sum.plus(new Decimal(item.quantity).times(item.unitCost)), new Decimal(0));
    const paid = new Decimal(input.amountPaid);
    if (paid.greaterThan(subtotal)) return { ok: false, error: "Amount paid cannot exceed the purchase total." };
    const paymentStatus = paid.isZero() ? "PENDING" : paid.lessThan(subtotal) ? "PARTIALLY_PAID" : "PAID";
    const purchase = await ctx.db.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          organizationId: ctx.organizationId,
          branchId: branch.id,
          warehouseId: warehouse.id,
          supplierId: supplier.id,
          purchaseNumber: `PUR-${Date.now()}`,
          supplierInvoiceNumber: input.invoiceNumber || null,
          purchaseDate: new Date(input.purchaseDate),
          subtotal: subtotal.toFixed(2), total: subtotal.toFixed(2),
          paymentStatus,
          paidOn: paymentStatus === "PAID" ? new Date(input.paymentDate || input.purchaseDate) : null,
          createdById: ctx.userId,
          items: { create: input.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity, unitCost: item.unitCost, total: new Decimal(item.quantity).times(item.unitCost).toFixed(2) })) },
        },
        include: { items: true },
      });
      for (const item of created.items) {
        const stock = await increaseStock(tx as unknown as Prisma.TransactionClient, { organizationId: ctx.organizationId, warehouseId: warehouse.id, variantId: item.variantId, quantity: item.quantity, unitCost: item.unitCost, type: "PURCHASE", referenceType: "Purchase", referenceId: created.id, createdById: ctx.userId });
        await tx.purchaseItem.update({ where: { id: item.id }, data: { batchId: stock.batch.id } });
      }
      if (!paid.isZero()) {
        await tx.purchasePayment.create({ data: { organizationId: ctx.organizationId, purchaseId: created.id, amount: paid.toFixed(2), method: input.paymentMethod, paymentDate: new Date(input.paymentDate || input.purchaseDate), createdById: ctx.userId } });
      }
      return created;
    }, { maxWait: 15000, timeout: 30000 });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "PURCHASE_CREATED", entityType: "Purchase", entityId: purchase.id, metadata: { purchaseNumber: purchase.purchaseNumber, total: subtotal.toFixed(2), paymentStatus } });
    revalidatePath("/dashboard/purchases");
    revalidatePath("/dashboard/inventory");
    return { ok: true, data: { id: purchase.id } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "Could not create purchase." };
  }
}

export async function recordPurchasePayment(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    await assertFeature(ctx, "purchases");
    assertPermission(ctx, "PURCHASE_APPROVE");
    const parsed = purchasePaymentSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment." };
    const input = parsed.data;
    const purchase = await ctx.db.purchase.findFirst({ where: { id: input.purchaseId }, include: { payments: true } });
    if (!purchase) return { ok: false, error: "Purchase not found." };
    const currentPaid = purchase.payments.reduce((sum, payment) => sum.plus(payment.amount.toString()), new Decimal(0));
    const amount = new Decimal(input.amount);
    if (amount.greaterThan(new Decimal(purchase.total.toString()).minus(currentPaid))) return { ok: false, error: "Payment cannot exceed the purchase balance." };
    const newPaid = currentPaid.plus(amount);
    await ctx.db.$transaction(async (tx) => {
      await tx.purchasePayment.create({ data: { organizationId: ctx.organizationId, purchaseId: purchase.id, amount: amount.toFixed(2), method: input.method, reference: input.reference || null, notes: input.notes || null, paymentDate: new Date(input.paymentDate || new Date()), createdById: ctx.userId } });
      await tx.purchase.update({ where: { id: purchase.id }, data: { paymentStatus: newPaid.greaterThanOrEqualTo(purchase.total) ? "PAID" : "PARTIALLY_PAID", paidOn: newPaid.greaterThanOrEqualTo(purchase.total) ? new Date(input.paymentDate || new Date()) : null } });
    });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "PURCHASE_PAYMENT_RECORDED", entityType: "Purchase", entityId: purchase.id, metadata: { amount: amount.toFixed(2), paymentStatus: newPaid.greaterThanOrEqualTo(purchase.total) ? "PAID" : "PARTIALLY_PAID" } });
    revalidatePath("/dashboard/purchases");
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "Could not record payment." };
  }
}

export async function receivePurchase(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    await assertFeature(ctx, "purchases");
    assertPermission(ctx, "PURCHASE_RECEIVE");
    const parsed = receivePurchaseSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Please fix the receipt.", fieldErrors: parsed.error.flatten().fieldErrors };
    const input = parsed.data;
    const order = await ctx.db.purchaseOrder.findFirst({ where: { id: input.purchaseOrderId }, include: { items: true } });
    if (!order) return { ok: false, error: "Purchase order not found." };
    const branch = await ctx.db.branch.findFirst({ where: { id: order.branchId } });
    if (!branch) return { ok: false, error: "Branch not found." };
    assertBranchAccess(ctx, branch.id);

    await ctx.db.$transaction(
      async (tx) => {
        const receipt = await tx.goodsReceipt.create({ data: { purchaseOrderId: order.id, receivedById: ctx.userId, notes: input.notes || null } });
        for (const item of input.items) {
          const orderItem = order.items.find((candidate) => candidate.id === item.purchaseOrderItemId);
          if (!orderItem) throw new Error("Purchase order item not found.");
          const remaining = new Decimal(orderItem.quantityOrdered.toString()).minus(orderItem.quantityReceived.toString());
          const received = new Decimal(item.quantity);
          if (received.greaterThan(remaining)) throw new Error(`Cannot receive more than the remaining quantity for ${orderItem.id}.`);
          const quantityStr = new Decimal(item.quantity).toString();
          await tx.goodsReceiptItem.create({ data: { goodsReceiptId: receipt.id, purchaseOrderItemId: orderItem.id, quantityReceived: quantityStr, batchNumber: item.batchNumber || null, expiryDate: item.expiryDate ? new Date(item.expiryDate) : null } });
          await increaseStock(tx as unknown as Prisma.TransactionClient, { organizationId: ctx.organizationId, warehouseId: order.warehouseId, variantId: orderItem.variantId, quantity: quantityStr, unitCost: orderItem.unitCost, type: "PURCHASE", referenceType: "PurchaseOrder", referenceId: order.id, createdById: ctx.userId, batchNumber: item.batchNumber || undefined, expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined });
          await tx.purchaseOrderItem.update({ where: { id: orderItem.id }, data: { quantityReceived: new Decimal(orderItem.quantityReceived.toString()).plus(received).toFixed(3) } });
        }
        const refreshed = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
        const complete = refreshed.every((item) => new Decimal(item.quantityReceived.toString()).greaterThanOrEqualTo(item.quantityOrdered.toString()));
        await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: complete ? "RECEIVED" : "PARTIALLY_RECEIVED" } });
      },
      { maxWait: 15000, timeout: 30000 }
    );
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "PURCHASE_RECEIVED", entityType: "PurchaseOrder", entityId: order.id, metadata: { itemCount: input.items.length } });
    revalidatePath("/dashboard/purchases");
    revalidatePath("/dashboard/inventory");
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "Could not receive purchase." };
  }
}

export async function createSupplierInvoice(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "PURCHASE_CREATE");
    const parsed = supplierInvoiceSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid invoice." };
    const input = parsed.data;
    const supplier = await ctx.db.supplier.findFirst({ where: { id: input.supplierId, isActive: true } });
    if (!supplier) return { ok: false, error: "Supplier not found." };
    if (input.purchaseOrderId) {
      const purchaseOrder = await ctx.db.purchaseOrder.findFirst({ where: { id: input.purchaseOrderId, supplierId: supplier.id } });
      if (!purchaseOrder) return { ok: false, error: "Purchase order not found for this supplier." };
    }
    await ctx.db.supplierInvoice.create({ data: { organizationId: ctx.organizationId, supplierId: supplier.id, purchaseOrderId: input.purchaseOrderId || null, invoiceNumber: input.invoiceNumber, amount: input.amount, dueDate: input.dueDate ? new Date(input.dueDate) : null } });
    revalidatePath("/dashboard/purchases");
    return { ok: true, data: undefined };
  } catch (e) { if (e instanceof AuthError) return { ok: false, error: e.message }; throw e; }
}

export async function paySupplierInvoice(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "PURCHASE_APPROVE");
    const parsed = supplierPaymentSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment." };
    const input = parsed.data;
    const invoice = await ctx.db.supplierInvoice.findFirst({ where: { id: input.invoiceId } });
    if (!invoice) return { ok: false, error: "Invoice not found." };
    const amount = new Decimal(input.amount);
    const remaining = new Decimal(invoice.amount.toString()).minus(invoice.amountPaid.toString());
    if (amount.greaterThan(remaining)) return { ok: false, error: "Payment cannot exceed the invoice balance." };
    const newPaid = new Decimal(invoice.amountPaid.toString()).plus(amount);
    await ctx.db.$transaction(async (tx) => {
      await tx.supplierPayment.create({ data: { organizationId: ctx.organizationId, supplierId: invoice.supplierId, invoiceId: invoice.id, amount: input.amount, method: input.method, reference: input.reference || null, createdById: ctx.userId } });
      await tx.supplierInvoice.update({ where: { id: invoice.id }, data: { amountPaid: newPaid.toFixed(2), status: newPaid.greaterThanOrEqualTo(invoice.amount) ? "PAID" : "PARTIALLY_PAID" } });
    });
    revalidatePath("/dashboard/purchases");
    return { ok: true, data: undefined };
  } catch (e) { if (e instanceof AuthError) return { ok: false, error: e.message }; throw e; }
}
