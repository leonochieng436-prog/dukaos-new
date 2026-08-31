import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, ReceiptText, RotateCcw, ShieldAlert, Tag } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { correctSale, refundSale, voidSale } from "@/app/actions/sales";
import { buildSaleVersionTimeline } from "@/lib/sales";

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function formatMethod(method: string) {
  switch (method) {
    case "MPESA":
      return "M-Pesa";
    case "BANK_TRANSFER":
      return "Bank transfer";
    case "CREDIT":
      return "Credit";
    default:
      return method.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

export default async function SalesDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  const ctx = await requireAuthContext();

  const [sale, correctionLogs] = await Promise.all([
    ctx.db.sale.findFirst({
      where: { id: saleId, organizationId: ctx.organizationId },
      include: {
        branch: true,
        register: true,
        cashier: true,
        customer: true,
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
        returns: { include: { items: true } },
      },
    }),
    ctx.db.auditLog.findMany({
      where: {
        organizationId: ctx.organizationId,
        entityType: "Sale",
        entityId: saleId,
        action: "SALE_CORRECTION_APPLIED",
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!sale) notFound();

  const timeline = buildSaleVersionTimeline({
    status: sale.status,
    hasReturn: sale.returns.length > 0,
    correctionCount: Math.max(0, sale.notes?.includes("Correction requested") ? 1 : 0),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/sales" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Back to sales
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/receipts/${sale.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted">
            <ReceiptText size={15} /> Receipt
          </a>
          <a href={`/api/receipts/${sale.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            <Tag size={15} /> Print
          </a>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(18,23,26,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Transaction</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">{sale.receiptNumber}</h1>
              </div>
              <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{sale.status}</span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted p-3">
                <p className="text-[12px] text-muted-foreground">Subtotal</p>
                <p className="mt-2 font-tabular text-lg font-semibold">{money.format(Number(sale.subtotal))}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted p-3">
                <p className="text-[12px] text-muted-foreground">Total</p>
                <p className="mt-2 font-tabular text-lg font-semibold">{money.format(Number(sale.total))}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted p-3">
                <p className="text-[12px] text-muted-foreground">Collected</p>
                <p className="mt-2 font-tabular text-lg font-semibold">{money.format(Number(sale.amountPaid))}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted p-3">
                <p className="text-[12px] text-muted-foreground">Change</p>
                <p className="mt-2 font-tabular text-lg font-semibold">{money.format(Number(sale.changeGiven))}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(18,23,26,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Items</h2>
              <span className="text-sm text-muted-foreground">{sale.items.length} line{sale.items.length === 1 ? "" : "s"}</span>
            </div>
            <div className="mt-4 space-y-3">
              {sale.items.map((item, index) => (
                <div key={item.id ? `${sale.id}-${item.id}` : `${sale.id}-item-${index}`} className="flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-surface-muted px-3 py-3">
                  <div>
                    <p className="font-medium text-foreground">{item.productNameSnapshot ?? item.variant?.product?.name ?? "Product"}</p>
                    <p className="text-sm text-muted-foreground">{item.variantNameSnapshot ?? item.variant?.name ?? "Variant"} · Qty {item.quantity.toString()} · {money.format(Number(item.unitPrice))}</p>
                  </div>
                  <p className="font-tabular font-semibold">{money.format(Number(item.total))}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(18,23,26,0.04)]">
            <h2 className="text-lg font-semibold">Summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Date</dt><dd>{new Date(sale.createdAt).toLocaleString("en-KE")}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cashier</dt><dd>{sale.cashier.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Branch</dt><dd>{sale.branch.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Register</dt><dd>{sale.register.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Customer</dt><dd>{sale.customer?.name ?? "Walk-in"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Payment</dt><dd>{sale.payments.map((payment) => formatMethod(payment.method)).join(" · ") || "—"}</dd></div>
            </dl>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(18,23,26,0.04)]">
            <h2 className="text-lg font-semibold">Edit transaction</h2>
            <form action={correctSale} className="mt-4 space-y-3 rounded-[var(--radius-md)] border border-border bg-surface-muted p-3">
              <input type="hidden" name="saleId" value={sale.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Proposed total</label>
                  <input name="total" defaultValue={sale.total.toString()} className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Amount paid</label>
                  <input name="amountPaid" defaultValue={sale.amountPaid.toString()} className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Payment method</label>
                  <select name="paymentMethod" defaultValue={sale.payments[0]?.method ?? "CASH"} className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm">
                    <option value="CASH">Cash</option>
                    <option value="MPESA">M-Pesa</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="CREDIT">Credit</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Correction reason</label>
                  <input name="reason" placeholder="Wrong quantity / price / payment" required className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Notes</label>
                <input name="note" placeholder="What was incorrect?" className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm" />
              </div>
              {sale.items.length > 0 && (
                <div className="rounded-[var(--radius-md)] border border-border bg-surface p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Remove sold items</p>
                  <div className="space-y-2">
                    {sale.items.map((item, index) => (
                      <label key={item.id ? `${sale.id}-${item.id}` : `${sale.id}-item-${index}`} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-2 py-1.5 text-sm">
                        <span className="min-w-0 truncate">
                          {item.productNameSnapshot ?? "Product"} · Qty {Number(item.quantity)}
                        </span>
                        <input type="checkbox" name="removeItemIds" value={item.id ?? `${sale.id}-item-${index}`} className="h-4 w-4 accent-primary" />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                Apply correction
              </button>
            </form>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(18,23,26,0.04)]">
            <h2 className="text-lg font-semibold">Actions</h2>
            <div className="mt-4 space-y-3">
              <form action={refundSale} className="space-y-3 rounded-[var(--radius-md)] border border-border bg-surface-muted p-3">
                <input type="hidden" name="saleId" value={sale.id} />
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Refund reason</label>
                  <input name="reason" placeholder="Customer requested refund" className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Refund method</label>
                  <select name="refundMethod" defaultValue="original_payment_method" className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm">
                    <option value="cash">Cash</option>
                    <option value="store_credit">Store credit</option>
                    <option value="original_payment_method">Original payment method</option>
                  </select>
                </div>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-warning px-3 py-2 text-sm font-semibold text-warning-foreground">
                  <RotateCcw size={15} /> Refund sale
                </button>
              </form>

              <form action={voidSale} className="space-y-3 rounded-[var(--radius-md)] border border-border bg-surface-muted p-3">
                <input type="hidden" name="saleId" value={sale.id} />
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Void reason</label>
                  <input name="reason" placeholder="Duplicate transaction / cashier error" required className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm" />
                </div>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground">
                  <ShieldAlert size={15} /> Void sale
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(18,23,26,0.04)]">
            <h2 className="text-lg font-semibold">Receipt history</h2>
            <div className="mt-4 space-y-3">
              {timeline.map((step) => (
                <div key={`${sale.id}-timeline-${step.version}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ${step.status === "original" ? "bg-primary text-primary-foreground" : step.status === "warning" ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"}`}>
                      {step.version}
                    </span>
                    {step.version !== timeline[timeline.length - 1].version && <span className="mt-1 h-full w-px bg-border" />}
                  </div>
                  <div className="flex-1 rounded-[var(--radius-md)] border border-border bg-surface-muted p-3">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Version {step.version}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(18,23,26,0.04)]">
            <h2 className="text-lg font-semibold">Correction history</h2>
            {correctionLogs.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No correction entries for this sale yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {correctionLogs.map((log) => {
                  const metadata = (log.metadata ?? {}) as Record<string, unknown>;
                  const original = (metadata.originalSnapshot as Record<string, unknown>) ?? {};
                  const corrected = (metadata.correctedSnapshot as Record<string, unknown>) ?? {};
                  const removedItems = Array.isArray(corrected.removedItemIds) ? corrected.removedItemIds : [];
                  const reason = typeof metadata.reason === "string" ? metadata.reason : (corrected.reason as string | undefined) ?? "Sale corrected";

                  return (
                    <div key={log.id} className="rounded-[var(--radius-md)] border border-border bg-surface-muted p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{reason}</p>
                        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {new Date(log.createdAt).toLocaleDateString("en-KE")}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-[var(--radius-sm)] border border-border bg-surface p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Before</p>
                          <dl className="mt-2 space-y-2 text-sm">
                            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Total</dt><dd className="font-tabular">KES {String(original.total ?? "0.00")}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Paid</dt><dd className="font-tabular">KES {String(original.amountPaid ?? "0.00")}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Method</dt><dd>{String(original.paymentMethod ?? "—")}</dd></div>
                          </dl>
                        </div>
                        <div className="rounded-[var(--radius-sm)] border border-border bg-surface p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">After</p>
                          <dl className="mt-2 space-y-2 text-sm">
                            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Total</dt><dd className="font-tabular">KES {String(corrected.total ?? "0.00")}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Paid</dt><dd className="font-tabular">KES {String(corrected.amountPaid ?? "0.00")}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Method</dt><dd>{String(corrected.paymentMethod ?? "—")}</dd></div>
                          </dl>
                        </div>
                      </div>
                      {removedItems.length > 0 && (
                        <div className="mt-3 rounded-[var(--radius-sm)] border border-dashed border-border bg-surface p-2 text-xs text-muted-foreground">
                          Removed items: {removedItems.join(", ")}
                        </div>
                      )}
                      {log.user && <p className="mt-3 text-[11px] text-muted-foreground">Updated by {log.user.name}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
