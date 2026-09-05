"use client";

import { useState, useTransition } from "react";
import { saveMpesaConfiguration } from "@/app/actions/mpesa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Account = { id: string; branchId: string | null; displayName: string; accountType: "TILL" | "PAYBILL"; shortcode: string; environment: "SANDBOX" | "PRODUCTION"; status: string } | null;
type Branch = { id: string; name: string };

export function MpesaForm({ account, branches }: { account: Account; branches: Branch[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveMpesaConfiguration({ accountId: account?.id, branchId: String(data.get("branchId") || ""), displayName: String(data.get("displayName") || ""), accountType: String(data.get("accountType") || "TILL"), shortcode: String(data.get("shortcode") || ""), environment: String(data.get("environment") || "SANDBOX"), consumerKey: String(data.get("consumerKey") || ""), consumerSecret: String(data.get("consumerSecret") || ""), passkey: String(data.get("passkey") || ""), testConnection: data.get("testConnection") === "on" });
      if (!result.ok) setError(result.error); else setMessage("M-Pesa configuration saved.");
    });
  }
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
    <div className="md:col-span-2"><label className="text-sm font-medium">Display name</label><Input name="displayName" defaultValue={account?.displayName ?? "Main M-Pesa account"} className="mt-1" required /></div>
    <div><label className="text-sm font-medium">Account type</label><select name="accountType" defaultValue={account?.accountType ?? "TILL"} className="mt-1 h-9 w-full rounded border border-border-strong bg-surface px-3 text-sm"><option value="TILL">M-Pesa Till</option><option value="PAYBILL">M-Pesa PayBill</option></select></div>
    <div><label className="text-sm font-medium">Branch</label><select name="branchId" defaultValue={account?.branchId ?? ""} className="mt-1 h-9 w-full rounded border border-border-strong bg-surface px-3 text-sm"><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div>
    <div><label className="text-sm font-medium">Shortcode</label><Input name="shortcode" defaultValue={account?.shortcode ?? ""} inputMode="numeric" className="mt-1" required /></div>
    <div><label className="text-sm font-medium">Environment</label><select name="environment" defaultValue={account?.environment ?? "SANDBOX"} className="mt-1 h-9 w-full rounded border border-border-strong bg-surface px-3 text-sm"><option value="SANDBOX">Sandbox</option><option value="PRODUCTION">Production</option></select></div>
    <div><label className="text-sm font-medium">Consumer key</label><Input name="consumerKey" type="password" autoComplete="new-password" className="mt-1" required /></div>
    <div><label className="text-sm font-medium">Consumer secret</label><Input name="consumerSecret" type="password" autoComplete="new-password" className="mt-1" required /></div>
    <div><label className="text-sm font-medium">Passkey</label><Input name="passkey" type="password" autoComplete="new-password" className="mt-1" required /></div>
    <label className="flex items-center gap-2 text-sm md:col-span-2"><input name="testConnection" type="checkbox" defaultChecked /> Test connection after saving</label>
    {account && <p className="text-sm text-muted-foreground md:col-span-2">Current status: <strong>{account.status.replaceAll("_", " ")}</strong>. Credentials are never displayed after saving.</p>}
    {error && <p className="rounded border border-danger/20 bg-danger-tint px-3 py-2 text-sm text-danger md:col-span-2">{error}</p>}
    {message && <p className="rounded border border-success/20 bg-success-tint px-3 py-2 text-sm text-success md:col-span-2">{message}</p>}
    <div className="md:col-span-2"><Button disabled={pending}>{pending ? "Testing connection..." : "Save M-Pesa configuration"}</Button></div>
  </form>;
}
