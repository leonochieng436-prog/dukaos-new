import Link from "next/link";
import { assertPermission, requireAuthContext } from "@/server/auth/context";
import { correctSale } from "@/app/actions/sales";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Filter, Search, ShieldCheck, Wallet } from "lucide-react";

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

function statusVariant(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "PARTIALLY_RETURNED" || status === "CORRECTION_PENDING") return "warning" as const;
  if (status === "VOIDED") return "danger" as const;
  return "secondary" as const;
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAuthContext();
  assertPermission(ctx, "SALES_VIEW");
  const params = searchParams ? await searchParams : {};
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const sales = await ctx.db.sale.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: "COMPLETED",
      createdAt: { gte: startOfDay, lte: endOfDay },
      ...(ctx.branchIds && ctx.branchIds.length > 0 ? { branchId: { in: ctx.branchIds } } : {}),
      ...(query
        ? {
            OR: [
              { receiptNumber: { contains: query, mode: "insensitive" } },
              { customer: { name: { contains: query, mode: "insensitive" } } },
              { cashier: { name: { contains: query, mode: "insensitive" } } },
              { items: { some: { productNameSnapshot: { contains: query, mode: "insensitive" } } } },
              { payments: { some: { providerRef: { contains: query, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    include: { branch: true, register: true, cashier: true, customer: true, payments: true, items: { select: { quantity: true, productNameSnapshot: true, total: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const totalCollected = sales.reduce((sum, sale) => sum + Number(sale.amountPaid), 0);
  const avgSale = sales.length > 0 ? totalSales / sales.length : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(18,23,26,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">SALES</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Today&apos;s Sales</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-surface">
              <Download size={15} /> Export
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-surface">
              <Filter size={15} /> Filters
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted p-4">
            <p className="text-[12px] text-muted-foreground">Gross sales</p>
            <p className="mt-3 font-tabular text-2xl font-semibold">{money.format(totalSales)}</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted p-4">
            <p className="text-[12px] text-muted-foreground">Transactions</p>
            <p className="mt-3 font-tabular text-2xl font-semibold">{sales.length}</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted p-4">
            <p className="text-[12px] text-muted-foreground">Average sale</p>
            <p className="mt-3 font-tabular text-2xl font-semibold">{money.format(avgSale)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[0_8px_24px_rgba(18,23,26,0.04)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full max-w-xl">
            <Search size={15} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
            <form method="get">
              <input
                name="q"
                defaultValue={query}
                placeholder="Search receipt, barcode, product, customer, cashier, payment ref..."
                className="h-11 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface pl-10 pr-3 text-sm"
              />
            </form>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {[
              "Today",
              "Branch",
              "Cashier",
              "Payment",
              "Status",
            ].map((filter) => (
              <button key={filter} type="button" className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[0_8px_24px_rgba(18,23,26,0.04)]">
        <div className="hidden grid-cols-[1.1fr_1fr_0.9fr_0.8fr_0.8fr_0.8fr_0.9fr_0.8fr] gap-3 border-b border-border bg-surface-muted px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:grid">
          <span>Receipt</span>
          <span>Date / Time</span>
          <span>Cashier</span>
          <span>Branch</span>
          <span>Items</span>
          <span>Total</span>
          <span>Payment</span>
          <span>Status</span>
        </div>

        {sales.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No sales match the current search.</div>
        ) : (
          sales.map((sale) => {
            const paymentLabel = sale.payments.length > 0 ? sale.payments.map((payment) => formatMethod(payment.method)).join(" · ") : "—";
            const itemCount = sale.items.reduce((sum, item) => sum + Number(item.quantity), 0);

            return (
              <div key={sale.id} className="grid gap-3 border-b border-border px-5 py-4 last:border-0 lg:grid-cols-[1.1fr_1fr_0.9fr_0.8fr_0.8fr_0.8fr_0.9fr_0.8fr] lg:items-center">
                <div className="min-w-0">
                  <Link href={`/dashboard/sales/${sale.id}`} className="block truncate text-sm font-semibold text-primary hover:underline">
                    {sale.receiptNumber}
                  </Link>
                  <p className="mt-1 text-[11px] text-muted-foreground">{sale.customer?.name ?? "Walk-in customer"}</p>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{new Date(sale.createdAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  <p>{new Date(sale.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{sale.cashier.name}</p>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{sale.branch.name}</p>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{itemCount}</p>
                </div>

                <div className="text-sm font-semibold font-tabular text-foreground">
                  {money.format(Number(sale.total))}
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{paymentLabel}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(sale.status)}>{sale.status}</Badge>
                  <Link href={`/dashboard/sales/${sale.id}`} className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2 py-1 text-[11px] font-medium text-primary hover:bg-surface-muted">
                    View
                  </Link>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 lg:col-span-8">
                  <Link href={`/dashboard/sales/${sale.id}`} className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-surface">
                    View transaction
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-muted-foreground">Collected today</p>
              <Wallet size={17} className="text-primary" />
            </div>
            <p className="mt-4 font-tabular text-xl font-semibold">{money.format(totalCollected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-muted-foreground">Refunds</p>
              <ShieldCheck size={17} className="text-primary" />
            </div>
            <p className="mt-4 font-tabular text-xl font-semibold">{money.format(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-muted-foreground">Corrections</p>
              <Filter size={17} className="text-primary" />
            </div>
            <p className="mt-4 font-tabular text-xl font-semibold">0</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
