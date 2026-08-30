import { redirect } from "next/navigation";
import { requireAuthContext } from "@/server/auth/context";
import { getRegisterSummary } from "@/server/services/register-summary";
import { TerminalLoginForm } from "./terminal-login-form";

export default async function PosTerminalLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ branchId?: string; registerId?: string }>;
}) {
  const ctx = await requireAuthContext();
  const params = (await searchParams) ?? {};
  const branchId = params.branchId ?? "";
  const registerId = params.registerId ?? "";

  if (!branchId || !registerId) {
    redirect("/dashboard/pos");
  }

  const register = await ctx.db.register.findFirst({
    where: {
      id: registerId,
      branchId,
      branch: { organizationId: ctx.organizationId },
      isActive: true,
    },
    include: { branch: true, credentials: true },
  });

  if (!register || !register.credentials?.isActive) {
    redirect("/dashboard/pos");
  }

  const lastSession = await ctx.db.cashSession.findFirst({
    where: { registerId: register.id, organizationId: ctx.organizationId },
    orderBy: { openedAt: "desc" },
    include: { user: true },
  });

  const lastSummary = lastSession ? await getRegisterSummary(ctx.db, lastSession.id) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Cashier access
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Terminal login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to {register.branch.name} · {register.name} before opening the register.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <TerminalLoginForm
          branchId={branchId}
          registerId={registerId}
          registerName={register.name}
          branchName={register.branch.name}
          requiredCode={register.credentials.terminalCode}
          lastSession={lastSession ? {
            id: lastSession.id,
            status: lastSession.status,
            openedAt: lastSession.openedAt,
            closedAt: lastSession.closedAt,
            cashierName: lastSession.user.name,
            expectedCash: lastSummary?.expectedCash ?? null,
            totalSales: lastSummary?.totalSales ?? null,
            transactionCount: lastSummary?.transactionCount ?? 0,
            variance: lastSession.variance ? Number(lastSession.variance) : null,
          } : null}
          isOwner={ctx.isOwner}
        />

        <div className="space-y-5">
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Register last session
            </p>
            {!lastSession || !lastSummary ? (
              <div className="mt-4 rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-muted p-3 text-sm text-muted-foreground">
                No prior session has been recorded for this register yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${lastSession.status === "OPEN" ? "bg-success-tint text-success" : "bg-neutral-soft text-muted-foreground"}`}>
                    {lastSession.status === "OPEN" ? "Open" : "Closed"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Cashier</span>
                  <span className="font-medium">{lastSession.user.name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Opened</span>
                  <span>{new Date(lastSession.openedAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
                {lastSession.closedAt && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Closed</span>
                    <span>{new Date(lastSession.closedAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Sales</span>
                  <span className="font-medium">{lastSummary.transactionCount} txn</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">KES {lastSummary.totalSales}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Expected cash</span>
                  <span className="font-medium">KES {lastSummary.expectedCash}</span>
                </div>
                {lastSession.variance !== null && lastSession.variance !== undefined && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Variance</span>
                    <span className={`font-medium ${Number(lastSession.variance) === 0 ? "text-success" : "text-danger"}`}>
                      KES {Number(lastSession.variance).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {ctx.isOwner && (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-primary/30 bg-primary-tint p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Cashier code instructions
              </p>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-foreground">
                <li>Open Settings → Branches.</li>
                <li>Select the branch and register you want to secure.</li>
                <li>Set a unique terminal code and a strong terminal password.</li>
                <li>Tick “Require terminal login for this register” and save.</li>
                <li>Share only the code and password with the cashier who should operate that register.</li>
              </ol>
              <p className="mt-4 rounded-[var(--radius-sm)] border border-primary/20 bg-surface p-3 text-[12px] text-muted-foreground">
                The owner always retains full access and can bypass the terminal gate when needed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
