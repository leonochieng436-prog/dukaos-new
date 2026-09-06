import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdmin } from "@/server/auth/admin-session";
import { rawPrisma } from "@/server/db/client";
import { PLAN_CATALOG, type Plan } from "@/lib/billing";
import { updateOrganizationLimits, updateOrganizationUserStatus } from "@/app/actions/admin";

export default async function OrganizationAdminPage({ params }: { params: Promise<{ organizationId: string }> }) {
  if (!await getCurrentAdmin()) redirect("/admin/login");
  const { organizationId } = await params;
  const subscription = await rawPrisma.subscription.findUnique({
    where: { organizationId },
    include: { organization: { include: { users: { include: { user: true, role: true }, orderBy: { createdAt: "asc" } } } } },
  });
  if (!subscription) redirect("/admin");

  const business = subscription.organization;
  return <main className="min-h-screen bg-background px-5 py-8 sm:px-8">
    <div className="mx-auto max-w-4xl space-y-8">
      <div><Link href="/admin" className="text-sm font-semibold text-primary hover:underline">Back to businesses</Link><p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Organization administration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{business.name}</h1><p className="mt-2 text-sm text-muted-foreground">Manage the users, plan, and resource limits for this organization.</p></div>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Plan and limits</h2>
        <form action={updateOrganizationLimits} className="mt-4 grid gap-3 sm:grid-cols-4 sm:items-end">
          <input type="hidden" name="organizationId" value={organizationId} />
          <label className="text-xs font-semibold text-muted-foreground">Plan<select name="plan" defaultValue={subscription.plan} className="mt-1 h-10 w-full rounded-md border border-border-strong bg-white px-3 text-sm">{(Object.keys(PLAN_CATALOG) as Plan[]).map((plan) => <option key={plan} value={plan}>{plan}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted-foreground">Branches<input name="branchLimit" type="number" min="1" defaultValue={subscription.branchLimit} className="mt-1 h-10 w-full rounded-md border border-border-strong px-3 text-sm" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Registers<input name="registerLimit" type="number" min="1" defaultValue={subscription.registerLimit} className="mt-1 h-10 w-full rounded-md border border-border-strong px-3 text-sm" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Users<input name="userLimit" type="number" min="1" defaultValue={subscription.userLimit} className="mt-1 h-10 w-full rounded-md border border-border-strong px-3 text-sm" /></label>
          <button type="submit" className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white sm:col-span-4 sm:justify-self-end">Save plan and limits</button>
        </form>
      </section>
      <section className="overflow-hidden rounded-xl border border-border bg-surface"><div className="border-b border-border px-5 py-5"><h2 className="font-semibold">Organization users ({business.users.length})</h2><p className="mt-1 text-sm text-muted-foreground">Deactivate access without deleting the user account.</p></div><div className="divide-y divide-border">{business.users.map((membership) => <div key={membership.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium">{membership.user.name}{membership.isOwner && <span className="ml-2 text-xs text-muted-foreground">Owner</span>}</p><p className="text-sm text-muted-foreground">{membership.user.email} · {membership.role.name}</p></div>{membership.isOwner ? <span className="text-xs font-semibold text-muted-foreground">Owner cannot be deactivated</span> : <form action={updateOrganizationUserStatus}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="userId" value={membership.userId} /><input type="hidden" name="isActive" value={String(!membership.isActive)} /><button type="submit" className={`rounded-md border px-3 py-2 text-xs font-semibold ${membership.isActive ? "border-warning text-warning hover:bg-warning-tint" : "border-success text-success hover:bg-success-tint"}`}>{membership.isActive ? "Deactivate access" : "Restore access"}</button></form>}</div>)}</div></section>
    </div>
  </main>;
}
