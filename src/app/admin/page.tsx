import { redirect } from "next/navigation";
import { approveSubscription, adminLogout } from "@/app/actions/admin";
import { getCurrentAdmin } from "@/server/auth/admin-session";
import { rawPrisma } from "@/server/db/client";
import { OrganizationActions } from "./organization-actions";

export default async function AdminPage() {
  if (!await getCurrentAdmin()) redirect("/admin/login");

  const subscriptions = await rawPrisma.subscription.findMany({
    where: { status: "pending_payment" },
    include: { organization: { include: { users: { where: { isOwner: true }, include: { user: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const businesses = await rawPrisma.subscription.findMany({
    include: { organization: { include: { users: { where: { isOwner: true }, include: { user: true } } } }, approvedByAdmin: true },
    orderBy: { createdAt: "desc" },
  });

  return <>
    <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4"><div><p className="text-sm font-semibold">DukaOS Admin</p><p className="text-xs text-muted-foreground">Registered users and payment approvals</p></div><form action={adminLogout}><button className="text-sm font-semibold text-primary hover:underline">Log out</button></form></header>
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-8">
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Platform control</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Business operations</h1><p className="mt-2 text-sm text-muted-foreground">Review payments, pause operations, resume access, or permanently delete a registered business.</p></div>
      <section className="overflow-hidden rounded-xl border border-border bg-surface"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Registered businesses ({businesses.length})</h2></div>{businesses.length === 0 ? <p className="px-5 py-8 text-sm text-muted-foreground">No registered businesses yet.</p> : <div className="divide-y divide-border">{businesses.map((subscription) => { const owner = subscription.organization.users[0]?.user; return <div key={subscription.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.2fr_0.8fr_auto] lg:items-center"><div><p className="font-semibold">{subscription.organization.name}</p><p className="mt-1 text-sm text-muted-foreground">{owner?.name} · {owner?.email}</p><p className="mt-1 text-xs text-muted-foreground">{subscription.plan} plan · Registered {subscription.createdAt.toLocaleString()}</p></div><div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${subscription.status === "active" ? "bg-success-tint text-success" : subscription.status === "paused" ? "bg-warning-tint text-warning" : "bg-surface-muted text-muted-foreground"}`}>{subscription.status.replaceAll("_", " ")}</span>{subscription.approvedAt && <p className="mt-2 text-xs text-muted-foreground">Approved {subscription.approvedAt.toLocaleString()}</p>}</div><OrganizationActions organizationId={subscription.organizationId} organizationName={subscription.organization.name} status={subscription.status} /></div>; })}</div>}</section>
      <section className="overflow-hidden rounded-xl border border-border bg-surface"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Pending payment approvals ({subscriptions.length})</h2></div>{subscriptions.length === 0 ? <p className="px-5 py-8 text-sm text-muted-foreground">No registrations are waiting for payment approval.</p> : <div className="divide-y divide-border">{subscriptions.map((subscription) => { const owner = subscription.organization.users[0]?.user; return <div key={subscription.id} className="grid gap-5 px-5 py-5 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center"><div><p className="font-semibold">{subscription.organization.name}</p><p className="mt-1 text-sm text-muted-foreground">{owner?.name} · {owner?.email}</p><p className="mt-1 text-xs text-muted-foreground">{subscription.plan} plan · Registered {subscription.createdAt.toLocaleString()}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment reference</p><p className="mt-1 text-sm font-medium">{subscription.paymentReference || "Not submitted"}</p><p className="mt-1 text-xs text-muted-foreground">{subscription.paymentSubmittedAt ? `Submitted ${subscription.paymentSubmittedAt.toLocaleString()}` : "Waiting for customer"}</p></div><form action={approveSubscription}><input type="hidden" name="subscriptionId" value={subscription.id} /><button type="submit" disabled={!subscription.paymentReference} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Approve payment</button></form></div>; })}</div>}</section>
    </main>
  </>;
}