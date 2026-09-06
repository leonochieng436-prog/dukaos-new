import { assertPermission, requireAuthContext } from "@/server/auth/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanForm } from "./plan-form";
import { computeEffectiveSubscriptionStatus, PLAN_CATALOG, type Plan } from "@/lib/billing";

export default async function BillingPage() {
  const ctx = await requireAuthContext();
  assertPermission(ctx, "BILLING_MANAGE");
  const [subscription, branches, registers, users] = await Promise.all([
    ctx.db.subscription.findUnique({ where: { organizationId: ctx.organizationId } }),
    ctx.db.branch.count({ where: { isActive: true } }),
    ctx.db.register.count({ where: { isActive: true } }),
    ctx.db.userOrganization.count({ where: { isActive: true } }),
  ]);
  const current = subscription ?? {
    plan: "trial",
    status: "trialing",
    branchLimit: 1,
    registerLimit: 1,
    userLimit: 2,
    trialEndsAt: null,
    currentPeriodEnd: null,
  };
  const effectiveStatus = computeEffectiveSubscriptionStatus(current);
  const catalog = PLAN_CATALOG[current.plan as Plan] ?? PLAN_CATALOG.trial;
  const usage = [
    ["Branches", branches, current.branchLimit],
    ["Registers", registers, current.registerLimit],
    ["Users", users, current.userLimit],
  ] as const;
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Subscriptions & billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage plan status and organization usage limits.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Plan: <strong>{current.plan}</strong> · Status:{" "}
            <strong>{effectiveStatus}</strong>
          </p>
          <p className="text-sm text-muted-foreground">Up to {current.branchLimit} branches, {current.registerLimit} registers, and {current.userLimit} users.</p>
          <p className="text-sm text-muted-foreground">
            Renews:{" "}
            {current.currentPeriodEnd
              ? current.currentPeriodEnd.toLocaleDateString()
              : "Not scheduled"}
          </p>
          <PlanForm currentPlan={current.plan} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Business resources</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {usage.map(([label, count, limit]) => {
            const percentage = Math.min(100, Math.round((count / limit) * 100));
            return <div key={label} className="rounded-md border border-border p-4"><div className="flex items-center justify-between text-sm"><span>{label}</span><strong>{count} / {limit}</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"><div className={`h-full rounded-full ${percentage >= 100 ? "bg-warning" : "bg-primary"}`} style={{ width: `${percentage}%` }} /></div>{percentage >= 100 && <p className="mt-2 text-xs text-warning">Limit reached. Upgrade to add another.</p>}</div>;
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Included features</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {Object.entries(catalog.features).map(([feature, enabled]) => <div key={feature} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span>{feature.replace(/([A-Z])/g, " $1")}</span><span className={enabled ? "text-success" : "text-muted-foreground"}>{enabled ? "Included" : "Growth and above"}</span></div>)}
        </CardContent>
      </Card>
    </div>
  );
}
