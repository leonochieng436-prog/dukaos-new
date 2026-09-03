import { assertPermission, requireAuthContext } from "@/server/auth/context";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ClipboardList, PackageCheck, Plus, Receipt, Truck, Users } from "lucide-react";
import { SupplierForm } from "./supplier-form";
import { PurchaseOrderForm } from "./purchase-order-form";
import { ReceiveForm } from "./receive-form";
import { InvoiceForm, PaymentForm, PurchasePaymentForm } from "./invoice-forms";
import { DirectPurchaseForm } from "./direct-purchase-form";

const money = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

function statusVariant(status: string) {
  if (status === "RECEIVED" || status === "PAID") return "success" as const;
  if (status === "PARTIALLY_RECEIVED" || status === "PARTIALLY_PAID") return "warning" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "primary" as const;
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAuthContext();
  assertPermission(ctx, "PURCHASE_VIEW");
  const params = searchParams ? await searchParams : {};
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const orderStatus = ["DRAFT", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"].includes(status) ? status : "";
  const today = new Date().toISOString().slice(0, 10);
  const [suppliers, branches, warehouses, variants, orders, goodsReceipts, invoices, allInvoices, paidOrders, purchases] = await Promise.all([
    ctx.db.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ctx.db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ctx.db.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ctx.db.productVariant.findMany({ where: { isActive: true, product: { isActive: true, organizationId: ctx.organizationId } }, include: { product: true }, orderBy: { product: { name: "asc" } } }),
    ctx.db.purchaseOrder.findMany({ where: { ...(orderStatus ? { status: orderStatus as "DRAFT" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED" } : {}), ...(query ? { OR: [{ poNumber: { contains: query, mode: "insensitive" } }, { supplier: { name: { contains: query, mode: "insensitive" } } }] } : {}) }, include: { supplier: true, branch: true, warehouse: true, items: { include: { variant: { include: { product: true } } } } }, orderBy: { createdAt: "desc" } }),
    ctx.db.goodsReceipt.findMany({
      where: { purchaseOrder: { organizationId: ctx.organizationId } },
      include: {
        purchaseOrder: { include: { supplier: true } },
        items: { include: { purchaseOrderItem: { include: { variant: { include: { product: true } } } } } },
      },
      orderBy: { receivedAt: "desc" },
      take: 8,
    }),
    ctx.db.supplierInvoice.findMany({ where: { status: { not: "PAID" } }, include: { supplier: true }, orderBy: { createdAt: "desc" } }),
    ctx.db.supplierInvoice.findMany({ select: { amount: true, amountPaid: true } }),
    ctx.db.purchaseOrder.findMany({ where: { status: { in: ["DRAFT", "SENT"] } }, select: { id: true } }),
    ctx.db.purchase.findMany({ where: { ...(status ? { paymentStatus: status as "PENDING" | "PARTIALLY_PAID" | "PAID" } : {}), ...(query ? { OR: [{ purchaseNumber: { contains: query, mode: "insensitive" } }, { supplier: { name: { contains: query, mode: "insensitive" } } }, { supplierInvoiceNumber: { contains: query, mode: "insensitive" } }] } : {}) }, include: { supplier: true, branch: true, warehouse: true, items: true, payments: true }, orderBy: { purchaseDate: "desc" } }),
  ]);
  const totalPurchases = purchases.reduce((sum, purchase) => sum + Number(purchase.total), 0);
  const directPaid = purchases.reduce((sum, purchase) => sum + purchase.payments.reduce((paidSum, payment) => paidSum + Number(payment.amount), 0), 0);
  const directOutstanding = totalPurchases - directPaid;
  const outstanding = allInvoices.reduce((sum, invoice) => sum + Number(invoice.amount) - Number(invoice.amountPaid), 0);
  const paid = allInvoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid), 0);
  const awaitingReceipt = orders.filter((order) => order.items.some((item) => Number(item.quantityReceived) < Number(item.quantityOrdered))).length;
  const kpis = [
    { label: "Total purchases", value: money.format(totalPurchases), detail: `${purchases.length} received purchases`, icon: ClipboardList },
    { label: "Pending payment", value: money.format(directOutstanding), detail: `${purchases.filter((purchase) => purchase.paymentStatus !== "PAID").length} supplier balances`, icon: Receipt },
    { label: "Amount paid", value: money.format(directPaid), detail: purchases.length ? `${Math.round((directPaid / Math.max(totalPurchases, 1)) * 100)}% settled` : "No purchases yet", icon: PackageCheck },
    { label: "Active suppliers", value: String(suppliers.length), detail: `${paidOrders.length} orders pending`, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Procurement workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Purchases</h1><p className="mt-2 text-sm text-muted-foreground">Trace supplier orders from purchase to receiving, inventory, and payment.</p></div>
        <a href="#new-purchase" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_5px_14px_rgba(15,123,108,0.18)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,123,108,0.18)]"><Plus size={16} /> New purchase</a>
      </div>
      <nav className="flex gap-5 overflow-x-auto border-b border-border pb-3 text-sm" aria-label="Purchases navigation"><Link className="whitespace-nowrap border-b-2 border-primary pb-3 font-semibold text-primary" href="/dashboard/purchases">Overview</Link><a className="whitespace-nowrap text-muted-foreground hover:text-foreground" href="#orders">Purchase orders</a><a className="whitespace-nowrap text-muted-foreground hover:text-foreground" href="#receiving">Goods received</a><a className="whitespace-nowrap text-muted-foreground hover:text-foreground" href="#invoices">Invoices & payments</a><a className="whitespace-nowrap text-muted-foreground hover:text-foreground" href="#suppliers">Suppliers</a></nav>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((item) => { const Icon = item.icon; return <Card key={item.label}><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-[12px] text-muted-foreground">{item.label}</p><Icon size={17} className="text-primary" /></div><p className="mt-4 text-xl font-semibold font-tabular">{item.value}</p><p className="mt-1 text-[12px] text-muted-foreground">{item.detail}</p></CardContent></Card>; })}</div>
      <Card id="new-purchase"><CardHeader><CardTitle>New purchase</CardTitle><p className="text-[12px] text-muted-foreground">Record goods received from a supplier. Inventory increases immediately; payment can wait.</p></CardHeader><CardContent><DirectPurchaseForm suppliers={suppliers.map((item) => ({ id: item.id, name: item.name }))} branches={branches.map((item) => ({ id: item.id, name: item.name }))} warehouses={warehouses.map((item) => ({ id: item.id, name: item.name, branchId: item.branchId }))} variants={variants.map((item) => ({ id: item.id, label: `${item.product.name}${item.name !== item.product.name ? ` - ${item.name}` : ""} (${item.sku})`, cost: item.costPrice.toString() }))} today={today} /></CardContent></Card>
      <Card id="purchase-ledger"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Purchase ledger</CardTitle><p className="mt-1 text-[12px] text-muted-foreground">Goods received and supplier payments stay separate.</p></div><form className="flex gap-2" method="get"><input name="q" defaultValue={query} placeholder="Search purchase or supplier" className="h-9 w-52 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm" /><select name="status" defaultValue={status} className="h-9 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-sm"><option value="">All payment statuses</option><option value="PENDING">Pending</option><option value="PARTIALLY_PAID">Partially paid</option><option value="PAID">Paid</option></select><button className="h-9 rounded-[var(--radius-sm)] border border-border px-3 text-sm hover:bg-surface-muted">Filter</button></form></div></CardHeader><CardContent className="p-0">{purchases.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No direct purchases match this view.</p> : <div className="overflow-x-auto"><div className="min-w-[820px]"><div className="grid grid-cols-[1fr_1.3fr_1.1fr_0.8fr_0.9fr_0.9fr_1fr] gap-3 border-y border-border bg-surface-muted px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><span>Purchase</span><span>Supplier</span><span>Date</span><span>Items</span><span>Total</span><span>Balance</span><span>Status</span></div>{purchases.map((purchase) => { const paidAmount = purchase.payments.reduce((sum, payment) => sum + Number(payment.amount), 0); return <div key={purchase.id} className="grid grid-cols-[1fr_1.3fr_1.1fr_0.8fr_0.9fr_0.9fr_1fr] gap-3 border-b border-border px-5 py-4 text-sm last:border-0"><div><p className="font-semibold">{purchase.purchaseNumber}</p><p className="text-[12px] text-muted-foreground">{purchase.branch.name}</p></div><p>{purchase.supplier.name}</p><p className="text-muted-foreground">{new Date(purchase.purchaseDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</p><p className="font-tabular">{purchase.items.length}</p><p className="font-tabular">{money.format(Number(purchase.total))}</p><p className="font-tabular">{money.format(Number(purchase.total) - paidAmount)}</p><Badge variant={statusVariant(purchase.paymentStatus)}>{purchase.paymentStatus === "PARTIALLY_PAID" ? "Partially paid" : purchase.paymentStatus === "PENDING" ? "Pending" : "Paid"}</Badge></div>; })}</div></div>}</CardContent></Card>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card id="orders"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Purchase orders</CardTitle><p className="mt-1 text-[12px] text-muted-foreground">{orders.length} matching orders</p></div><form className="flex gap-2" method="get"><input name="q" defaultValue={query} placeholder="Search PO or supplier" className="h-9 w-48 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm" /><select name="status" defaultValue={status} className="h-9 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-sm"><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="SENT">Ordered</option><option value="PARTIALLY_RECEIVED">Partially received</option><option value="RECEIVED">Received</option><option value="CANCELLED">Cancelled</option></select><button className="h-9 rounded-[var(--radius-sm)] border border-border px-3 text-sm hover:bg-surface-muted">Filter</button></form></div></CardHeader><CardContent className="p-0"><div className="hidden grid-cols-[1.1fr_1.2fr_1fr_0.8fr_0.9fr] gap-3 border-y border-border bg-surface-muted px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid"><span>Order</span><span>Supplier</span><span>Location</span><span>Status</span><span className="text-right">Total</span></div>{orders.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No purchase orders match this view.</p> : orders.map((order) => <div key={order.id} className="grid gap-2 border-b border-border px-5 py-4 last:border-0 md:grid-cols-[1.1fr_1.2fr_1fr_0.8fr_0.9fr] md:items-center md:gap-3"><div><p className="text-sm font-semibold">{order.poNumber}</p><p className="text-[12px] text-muted-foreground">{order.createdAt.toLocaleDateString("en-KE")}</p></div><p className="text-sm">{order.supplier.name}</p><p className="text-[12px] text-muted-foreground">{order.branch.name} · {order.warehouse.name}</p><Badge variant={statusVariant(order.status)}>{order.status.replaceAll("_", " ")}</Badge><p className="text-right text-sm font-semibold font-tabular">{money.format(Number(order.total))}</p></div>)} </CardContent></Card>
        <Card id="receiving"><CardHeader><CardTitle>Receiving queue</CardTitle><p className="text-[12px] text-muted-foreground">Orders with stock still to receive</p></CardHeader><CardContent>{awaitingReceipt === 0 ? <p className="text-sm text-muted-foreground">Everything is fully received.</p> : <div className="space-y-3"><div className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-warning-tint px-3 py-3"><Truck size={18} className="text-warning" /><div><p className="text-sm font-semibold">{awaitingReceipt} awaiting receipt</p><p className="text-[12px] text-muted-foreground">Receive stock to update inventory.</p></div></div><a href="#receiving-forms" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open receiving forms <ArrowUpRight size={14} /></a></div>}</CardContent></Card>
      </div>
      <Card id="receiving-history">
        <CardHeader>
          <CardTitle>Goods received</CardTitle>
          <p className="text-[12px] text-muted-foreground">Recent purchase receipts recorded into stock.</p>
        </CardHeader>
        <CardContent className="p-0">
          {goodsReceipts.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">No goods received yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[1.1fr_1.4fr_1.8fr_0.7fr_0.9fr] gap-3 border-y border-border bg-surface-muted px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>PO</span>
                  <span>Supplier</span>
                  <span>Product</span>
                  <span>Qty</span>
                  <span>Date</span>
                </div>
                {goodsReceipts.flatMap((receipt) =>
                  receipt.items.map((item) => {
                    const productLabel = `${item.purchaseOrderItem.variant.product.name}${item.purchaseOrderItem.variant.name !== item.purchaseOrderItem.variant.product.name ? ` - ${item.purchaseOrderItem.variant.name}` : ""}`;
                    return (
                      <div key={item.id} className="grid grid-cols-[1.1fr_1.4fr_1.8fr_0.7fr_0.9fr] gap-3 border-b border-border px-5 py-3 text-sm last:border-0">
                        <div className="font-medium text-foreground">{receipt.purchaseOrder.poNumber}</div>
                        <div className="text-muted-foreground">{receipt.purchaseOrder.supplier.name}</div>
                        <div className="font-medium text-foreground">{productLabel}</div>
                        <div className="font-tabular text-foreground">{Number(item.quantityReceived).toLocaleString("en-KE", { maximumFractionDigits: 3 })}</div>
                        <div className="text-muted-foreground">{new Date(receipt.receivedAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div id="suppliers" className="grid gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle>Suppliers</CardTitle><p className="text-[12px] text-muted-foreground">Active suppliers available for new orders</p></CardHeader><CardContent><div className="flex items-end justify-between"><p className="text-3xl font-semibold font-tabular">{suppliers.length}</p><a href="#new-supplier" className="text-sm font-medium text-primary hover:underline">Add supplier</a></div></CardContent></Card><Card id="invoices"><CardHeader><CardTitle>Invoices & payments</CardTitle><p className="text-[12px] text-muted-foreground">Outstanding supplier balance</p></CardHeader><CardContent><p className="text-3xl font-semibold font-tabular">{money.format(outstanding)}</p><p className="mt-1 text-[12px] text-muted-foreground">Record payments below to keep payables current.</p></CardContent></Card></div>
      <div id="new-supplier"><Card><CardHeader><CardTitle>Add supplier</CardTitle></CardHeader><CardContent><SupplierForm /></CardContent></Card></div>
      <div id="legacy-new-purchase"><Card><CardHeader><CardTitle>New purchase order</CardTitle><p className="text-[12px] text-muted-foreground">Create an order, then receive goods separately when they arrive.</p></CardHeader><CardContent><PurchaseOrderForm suppliers={suppliers.map((item) => ({ id: item.id, name: item.name }))} branches={branches.map((item) => ({ id: item.id, name: item.name }))} warehouses={warehouses.map((item) => ({ id: item.id, name: item.name, branchId: item.branchId }))} variants={variants.map((item) => ({ id: item.id, label: `${item.product.name}${item.name !== item.product.name ? ` - ${item.name}` : ""} (${item.sku})`, cost: item.costPrice.toString() }))} /></CardContent></Card></div>
      <div id="receiving-forms" className="space-y-4"><Card><CardHeader><CardTitle>Receive goods</CardTitle><p className="text-[12px] text-muted-foreground">Partial receipts update the inventory ledger and leave the balance open.</p></CardHeader><CardContent className="space-y-5">{orders.filter((order) => order.items.some((item) => Number(item.quantityOrdered) > Number(item.quantityReceived))).map((order) => { const receiptItems = order.items.filter((item) => Number(item.quantityOrdered) > Number(item.quantityReceived)).map((item) => ({ id: item.id, label: `${item.variant.product.name} (${item.variant.sku})`, remaining: (Number(item.quantityOrdered) - Number(item.quantityReceived)).toString() })); return <div key={order.id}><p className="text-sm font-semibold">{order.poNumber} · {order.supplier.name}</p><ReceiveForm purchaseOrderId={order.id} items={receiptItems} /></div>; })}</CardContent></Card></div>
      <div className="space-y-6"><Card><CardHeader><CardTitle>Supplier invoice</CardTitle></CardHeader><CardContent><InvoiceForm suppliers={suppliers.map((item) => ({ id: item.id, label: item.name }))} /></CardContent></Card><Card><CardHeader><CardTitle>Record purchase payment</CardTitle><p className="text-[12px] text-muted-foreground">Settle a pending or partially paid purchase without changing its receiving date.</p></CardHeader><CardContent className="space-y-4">{purchases.filter((purchase) => purchase.paymentStatus !== "PAID").length === 0 ? <p className="text-sm text-muted-foreground">No outstanding direct purchases.</p> : <PurchasePaymentForm purchases={purchases.filter((purchase) => purchase.paymentStatus !== "PAID").map((purchase) => { const paidAmount = purchase.payments.reduce((sum, payment) => sum + Number(payment.amount), 0); const balance = (Number(purchase.total) - paidAmount).toFixed(2); return { id: purchase.id, balance, label: `${purchase.purchaseNumber} - ${purchase.supplier.name} (${money.format(Number(balance))} due)` }; })} />}<div className="border-t border-border pt-4">{invoices.length === 0 ? <p className="text-sm text-muted-foreground">No outstanding legacy invoices.</p> : <PaymentForm invoices={invoices.map((item) => ({ id: item.id, label: `${item.supplier.name} - ${item.invoiceNumber} (${money.format(Number(item.amount))})` }))} />}</div></CardContent></Card></div>
    </div>
  );
}
