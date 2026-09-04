"use client";

import { useMemo, useState } from "react";
import { MoreVertical, Search, UserRound } from "lucide-react";
import { deleteOrganization, pauseOrganization, resumeOrganization } from "@/app/actions/admin";

export type AdminBusiness = {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  status: string;
  registeredAt: string;
  approvedAt: string | null;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not approved";
}

function StatusPill({ label, tone }: { label: string; tone: "success" | "warning" | "neutral" }) {
  const styles = { success: "bg-success-tint text-success", warning: "bg-warning-tint text-warning", neutral: "bg-surface-muted text-muted-foreground" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${styles[tone]}`}>{label}</span>;
}

export function BusinessDirectory({ businesses }: { businesses: AdminBusiness[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const plans = [...new Set(businesses.map((business) => business.plan))];
  const filtered = useMemo(() => businesses.filter((business) => {
    const haystack = `${business.name} ${business.ownerName} ${business.ownerEmail}`.toLowerCase();
    const matchesQuery = haystack.includes(query.toLowerCase());
    const operationalStatus = business.status === "paused" ? "paused" : "active";
    return matchesQuery && (status === "all" || operationalStatus === status) && (plan === "all" || business.plan === plan);
  }), [businesses, plan, query, status]);

  return <section className="overflow-hidden rounded-xl border border-border bg-surface">
    <div className="border-b border-border px-5 py-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-semibold">Registered businesses</h2><p className="mt-1 text-sm text-muted-foreground">{businesses.length} {businesses.length === 1 ? "business" : "businesses"} registered</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><label className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search businesses..." className="h-10 w-full rounded-md border border-border-strong bg-white pl-9 pr-3 text-sm outline-none focus:border-primary sm:w-64" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-border-strong bg-white px-3 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option></select><select value={plan} onChange={(event) => setPlan(event.target.value)} className="h-10 rounded-md border border-border-strong bg-white px-3 text-sm"><option value="all">All plans</option>{plans.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div></div>
    <div className="hidden grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_110px_150px_48px] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:grid"><span>Business</span><span>Owner</span><span>Plan</span><span>Status</span><span /></div>
    {filtered.length === 0 ? <div className="px-5 py-12 text-center"><p className="font-medium">No businesses found</p><p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p></div> : <div className="divide-y divide-border">{filtered.map((business) => { const isPaused = business.status === "paused"; const isPending = business.status === "pending_payment"; return <article key={business.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_110px_150px_48px] lg:items-center"><div><p className="font-semibold">{business.name}</p><p className="mt-1 text-xs text-muted-foreground">Registered {formatDate(business.registeredAt)}</p><p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground lg:hidden"><UserRound size={14} /> {business.ownerName}</p><p className="text-xs text-muted-foreground lg:hidden">{business.ownerEmail}</p></div><div className="hidden lg:block"><p className="text-sm font-medium">{business.ownerName}</p><p className="mt-1 text-xs text-muted-foreground">{business.ownerEmail}</p></div><div><span className="font-mono text-xs font-semibold uppercase">{business.plan}</span></div><div className="space-y-2"><div className="flex flex-wrap gap-1.5"><StatusPill label={isPending ? "Pending approval" : "Approved"} tone={isPending ? "neutral" : "success"} /><StatusPill label={isPaused ? "Paused" : "Active"} tone={isPaused ? "warning" : "success"} /></div><p className="text-[11px] text-muted-foreground">{business.approvedAt ? `Approved ${formatDate(business.approvedAt)}` : "Awaiting payment approval"}</p></div><details className="relative justify-self-start lg:justify-self-end"><summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-md border border-border text-muted-foreground hover:bg-surface-muted hover:text-foreground"><MoreVertical size={17} /></summary><div className="absolute right-0 z-10 mt-2 w-52 rounded-lg border border-border bg-surface p-1.5 shadow-lg"><div className="border-b border-border px-3 py-2"><p className="text-xs font-semibold">Business actions</p><p className="text-[11px] text-muted-foreground">{isPaused ? "Operations suspended" : "Operations running"}</p></div>{!isPending && (isPaused ? <form action={resumeOrganization}><input type="hidden" name="organizationId" value={business.id} /><button className="w-full px-3 py-2 text-left text-xs font-semibold text-success hover:bg-success-tint">Resume operations</button></form> : <form action={pauseOrganization}><input type="hidden" name="organizationId" value={business.id} /><button className="w-full px-3 py-2 text-left text-xs font-semibold text-warning hover:bg-warning-tint">Pause operations</button></form>)}<form action={deleteOrganization} onSubmit={(event) => { if (!window.confirm(`Delete ${business.name} permanently? This removes users, branches, inventory, sales, purchases, and other business data. This cannot be undone.`)) event.preventDefault(); }}><input type="hidden" name="organizationId" value={business.id} /><button className="w-full border-t border-border px-3 py-2 text-left text-xs font-semibold text-danger hover:bg-danger-tint">Delete permanently</button></form></div></details></article>; })}</div>}
  </section>;
}