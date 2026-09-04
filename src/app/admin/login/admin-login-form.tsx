"use client";

import { useState, useTransition } from "react";
import { adminLogin } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

export function AdminLoginForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await adminLogin({ email: String(formData.get("email") || ""), password: String(formData.get("password") || "") });
      if (!result.ok) setError(result.error ?? "Unable to sign in.");
      else if (result.data) window.location.assign(result.data.redirectTo);
    });
  }
  return <main className="flex min-h-screen items-center justify-center bg-background px-5"><form action={submit} className="w-full max-w-md space-y-6 rounded-xl border border-border bg-surface p-8 shadow-sm"><div><div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-primary-tint text-primary"><ShieldCheck size={24} /></div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Platform administration</p><h1 className="mt-2 text-2xl font-semibold">Verify registered users</h1><p className="mt-2 text-sm text-muted-foreground">Review payment references and activate customer workspaces.</p></div>{error && <p className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}<div className="space-y-2"><Label htmlFor="admin-email">Admin email</Label><Input id="admin-email" name="email" type="email" defaultValue="admin@gmail.com" required /></div><div className="space-y-2"><Label htmlFor="admin-password">Password</Label><Input id="admin-password" name="password" type="password" defaultValue="admin@123" required /></div><Button type="submit" className="w-full" disabled={pending}>{pending ? "Signing in..." : "Open verification desk"}</Button><a href="/login" className="block text-center text-sm text-primary hover:underline">Back to business login</a></form></main>;
}