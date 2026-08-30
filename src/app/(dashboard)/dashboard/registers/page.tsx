import Link from "next/link";
import Decimal from "decimal.js";
import { ArrowRight, CreditCard, DollarSign, ShieldCheck } from "lucide-react";
import { AuthError, requireAuthContext } from "@/server/auth/context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRegisterSummary } from "@/server/services/register-summary";

export default async function RegistersPage() {
  const ctx = await requireAuthContext();
  const canViewRegisters = ctx.permissions.has("SETTINGS_MANAGE") || ctx.permissions.has("CASH_SESSION_VIEW_ALL") || ctx.permissions.has("SALES_VIEW");
  if (!canViewRegisters) {
    throw new AuthError("Missing permission to view register activity", 403);
  }

  const [registers, recentSessions] = await Promise.all([
    ctx.db.register.findMany({
      where: { branch: { organizationId: ctx.organizationId, ...(ctx.branchIds ? { id: { in: ctx.branchIds } } : {}) } },
      include: { branch: true, cashSessions: { orderBy: { openedAt: "desc" }, take: 1, include: { user: true } } },
      orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    }),
    ctx.db.cashSession.findMany({
      where: { organizationId: ctx.organizationId, ...(ctx.branchIds ? { branchId: { in: ctx.branchIds } } : {}) },
      include: { branch: true, register: true, user: true },
      orderBy: { openedAt: "desc" },
      take: 8,
    }),
  ]);

  const formatMoney = (value: Decimal | string) => `KES ${new Decimal(value).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Register management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">POS terminals</h1>
        </div>
        <Link href="/dashboard/pos" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          Open POS <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {registers.map(async (register) => {
          const session = register.cashSessions[0] ?? null;
          const summary = session && session.status === "OPEN" ? await getRegisterSummary(ctx.db, session.id) : null;
          const isOpen = Boolean(session && session.status === "OPEN");

          return (
            <Card key={register.id}>
              <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
                <div>
                  <CardTitle>{register.name}</CardTitle>
                  <p className="mt-1 text-[12px] text-muted-foreground">{register.branch.name}</p>
                </div>
                <Badge variant={isOpen ? "success" : "neutral"}>{isOpen ? "Open" : "Closed"}</Badge>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Status</p>
                    <p className="mt-1 text-sm font-semibold">{isOpen ? "Active session" : "Idle"}</p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Cashier</p>
                    <p className="mt-1 text-sm font-semibold">{session?.user.name ?? "Unassigned"}</p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Sales</p>
                    <p className="mt-1 text-sm font-semibold">{summary ? summary.transactionCount : 0}</p>
                  </div>
                </div>

                {summary ? (
                  <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Open session</p>
                        <p className="mt-1 text-sm font-semibold">{session?.openedAt.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                      <ShieldCheck size={16} className="text-success" />
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Drawer</p>
                        <p className="mt-1 font-tabular text-sm font-semibold">{formatMoney(summary.expectedCash)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Sales total</p>
                        <p className="mt-1 font-tabular text-sm font-semibold">{formatMoney(summary.totalSales)}</p>
                      </div>
                    </div>
                    <Link href={`/dashboard/registers/${session!.id}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                      View session details <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-dashed border-border p-3 text-sm text-muted-foreground">
                    No active session is currently open on this register.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard size={16} className="text-primary" /> Recent register sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {recentSessions.map((session) => (
              <div key={session.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{session.branch.name} · {session.register.name}</p>
                  <p className="text-[12px] text-muted-foreground">{session.user.name} · {session.status === "OPEN" ? "Open" : "Closed"} · {session.openedAt.toLocaleDateString("en-KE")}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-tabular text-muted-foreground">
                    {session.status === "OPEN" ? "Open session" : session.closedAt ? `Closed ${session.closedAt.toLocaleDateString("en-KE")}` : "Closed"}
                  </span>
                  <Link href={`/dashboard/registers/${session.id}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                    Details <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
