"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openCashSession } from "@/app/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TerminalLoginForm({
  branchId,
  registerId,
  registerName,
  branchName,
  requiredCode,
  lastSession,
  isOwner,
}: {
  branchId: string;
  registerId: string;
  registerName: string;
  branchName: string;
  requiredCode: string;
  lastSession: {
    id: string;
    status: "OPEN" | "CLOSED";
    openedAt: Date;
    closedAt: Date | null;
    cashierName: string;
    expectedCash: string | null;
    totalSales: string | null;
    transactionCount: number;
    variance: number | null;
  } | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function submit(formData: FormData) {
    setError(null);
    const payload = {
      branchId,
      registerId,
      openingBalance: String(formData.get("openingBalance") || ""),
      terminalCode: String(formData.get("terminalCode") || ""),
      terminalPassword: String(formData.get("terminalPassword") || ""),
    };

    startTransition(async () => {
      const result = await openCashSession(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/dashboard/pos");
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-sm">
      <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted p-3 text-sm">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Register</p>
        <p className="mt-1 font-semibold">{branchName} · {registerName}</p>
        {lastSession && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            Last activity: {lastSession.status === "OPEN" ? "open" : "closed"} by {lastSession.cashierName}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-[var(--radius-sm)] bg-danger-tint px-3 py-2 text-[13px] text-danger">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="terminalCode" className="text-sm font-medium text-foreground">
          Terminal code
        </label>
        <Input
          id="terminalCode"
          name="terminalCode"
          placeholder={requiredCode}
          required
          className="h-11"
        />
        <p className="text-[12px] text-muted-foreground">Use the code assigned to this register by the business owner.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="terminalPassword" className="text-sm font-medium text-foreground">
          Terminal password
        </label>
        <div className="relative">
          <Input
            id="terminalPassword"
            name="terminalPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Enter the register password"
            required
            className="h-11 pr-11"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="openingBalance" className="text-sm font-medium text-foreground">
          Opening cash
        </label>
        <Input
          id="openingBalance"
          name="openingBalance"
          type="number"
          min="0"
          step="0.01"
          placeholder="KSh 5,000"
          required
          className="h-11"
        />
      </div>

      {isOwner && (
        <div className="rounded-[var(--radius-sm)] border border-primary/20 bg-primary-tint px-3 py-2 text-[12px] text-primary">
          Owner access is enabled; you can bypass the terminal credential check.
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Opening register..." : "Unlock register"}
      </Button>
    </form>
  );
}
