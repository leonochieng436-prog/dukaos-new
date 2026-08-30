import Link from "next/link";
import Decimal from "decimal.js";
import { ArrowLeft, Banknote, CreditCard, ReceiptText, TrendingUp } from "lucide-react";
import { notFound } from "next/navigation";
import { AuthError, requireAuthContext } from "@/server/auth/context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloseSessionForm } from "@/app/(dashboard)/dashboard/pos/close-session-form";
import { getRegisterSummary } from "@/server/services/register-summary";

export default async function RegisterSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const ctx = await requireAuthContext();
  const { sessionId } = await params;

  const canViewRegisters = ctx.permissions.has("SETTINGS_MANAGE") || ctx.permissions.has("CASH_SESSION_VIEW_ALL") || ctx.permissions.has("SALES_VIEW");
  if (!canViewRegisters) {
    throw new AuthError("Missing permission to view register activity", 403);
  }

  const session = await ctx.db.cashSession.findFirst({
    where: { id: sessionId, organizationId: ctx.organizationId },
    include: {
      branch: true,
      register: true,
      user: true,
      sales: {
        orderBy: { createdAt: "asc" },
        include: {
          customer: true,
          payments: { where: { status: "CONFIRMED" } },
          items: { include: { variant: { include: { product: true } } } },
        },
      },
      movements: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) {
    notFound();
  }

  if (ctx.branchIds && !ctx.branchIds.includes(session.branchId)) {
    throw new AuthError("No access to this register session", 403);
  }

  const summary = await getRegisterSummary(ctx.db, session.id);
  if (!summary) {
    notFound();
  }

  const formatMoney = (value: Decimal | string) => `KES ${new Decimal(value).toFixed(2)}`;
  const variance = new Decimal(summary.expectedCash).minus(new Decimal(session.actualBalance?.toString() ?? "0"));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard/registers" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft size={14} /> Back to registers
          </Link>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Session details</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{session.branch.name} · {session.register.name}</h1>
        </div>
        <Badge variant={session.status === "OPEN" ? "success" : "neutral"}>{session.status}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">Cashier</p>
            <p className="mt-2 text-lg font-semibold">{session.user.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">Opened</p>
            <p className="mt-2 text-lg font-semibold">{session.openedAt.toLocaleDateString("en-KE")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">Expected cash</p>
            <p className="mt-2 text-lg font-semibold font-tabular">{formatMoney(summary.expectedCash)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">Actual cash</p>
            <p className="mt-2 text-lg font-semibold font-tabular">{formatMoney(session.actualBalance?.toString() ?? "0")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Banknote size={16} className="text-primary" /> Session summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Opening balance</p>
                <p className="mt-1 font-tabular text-sm font-semibold">{formatMoney(summary.openingCash)}</p>
              </div>
              <div className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Total sales</p>
                <p className="mt-1 font-tabular text-sm font-semibold">{formatMoney(summary.totalSales)}</p>
              </div>
              <div className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Variance</p>
                <p className={`mt-1 font-tabular text-sm font-semibold ${variance.isZero() ? "text-success" : variance.greaterThan(0) ? "text-warning" : "text-danger"}`}>{formatMoney(variance.abs())} {variance.greaterThan(0) ? "over" : variance.lessThan(0) ? "under" : "on target"}</p>
              </div>
              <div className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Transactions</p>
                <p className="mt-1 font-tabular text-sm font-semibold">{summary.transactionCount}</p>
              </div>
            </div>

            {session.status === "OPEN" && (
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <CloseSessionForm sessionId={session.id} summary={{ transactionCount: summary.transactionCount, totalSales: summary.totalSales, payments: summary.payments, expectedCash: summary.expectedCash, cashSales: summary.cashSales, cashRefunds: summary.cashRefunds, cashExpenses: summary.cashExpenses, cashDeposits: summary.cashDeposits, cashWithdrawals: summary.cashWithdrawals, branch: summary.branch, register: summary.register, cashier: summary.cashier, heldSales: summary.heldSales }} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> Payment summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {Object.entries(summary.payments).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
                <span className="text-sm font-medium">{method.replace("_", " ")}</span>
                <span className="font-tabular text-sm font-semibold">{formatMoney(amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ReceiptText size={16} className="text-primary" /> Sales in this session</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {session.sales.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No sales have been recorded in this register session yet.</p>
              ) : (
                session.sales.map((sale) => (
                  <div key={sale.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{sale.receiptNumber}</p>
                        <p className="text-[12px] text-muted-foreground">{sale.customer?.name ?? "Walk-in customer"} · {sale.createdAt.toLocaleDateString("en-KE")}</p>
                      </div>
                      <span className="font-tabular text-sm font-semibold">{formatMoney(sale.total)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sale.payments.map((payment) => (
                        <span key={payment.id} className="rounded-full bg-surface-muted px-2 py-1 text-[11px] text-muted-foreground">{payment.method} · {formatMoney(payment.amount)}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard size={16} className="text-primary" /> Cash movements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {session.movements.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No internal cash movements have been recorded for this session.</p>
              ) : (
                session.movements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{movement.type}</p>
                      <p className="text-[12px] text-muted-foreground">{movement.createdAt.toLocaleDateString("en-KE")}</p>
                    </div>
                    <span className="font-tabular text-sm font-semibold">{formatMoney(movement.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
