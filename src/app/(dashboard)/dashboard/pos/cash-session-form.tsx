"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openCashSession } from "@/app/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BranchOption = { id: string; name: string };
type RegisterOption = { id: string; name: string; branchId: string };

export function CashSessionForm({ branches, registers }: { branches: BranchOption[]; registers: RegisterOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [registerId, setRegisterId] = useState(registers.find((register) => register.branchId === branches[0]?.id)?.id ?? "");
  const visibleRegisters = useMemo(() => registers.filter((register) => register.branchId === branchId), [branchId, registers]);
  const selectedBranch = branches.find((branch) => branch.id === branchId) ?? branches[0];
  const selectedRegister = visibleRegisters.find((register) => register.id === registerId) ?? visibleRegisters[0] ?? null;

  const ensureValidSelection = (nextBranchId: string, nextRegisterId?: string) => {
    const nextRegisters = registers.filter((register) => register.branchId === nextBranchId);
    if (!nextRegisters.length) {
      return { branchId: nextBranchId, registerId: "" };
    }
    const fallbackRegister = nextRegisters[0].id;
    return {
      branchId: nextBranchId,
      registerId: nextRegisterId && nextRegisters.some((register) => register.id === nextRegisterId) ? nextRegisterId : fallbackRegister,
    };
  };

  function submit(formData: FormData) {
    const nextBranchId = String(formData.get("branchId") || branchId);
    const nextRegisterId = String(formData.get("registerId") || registerId);
    startTransition(async () => {
      const result = await openCashSession({ branchId: nextBranchId, registerId: nextRegisterId, openingBalance: String(formData.get("openingBalance") || "") });
      if (result.ok) router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Open register</p>
          <h2 className="mt-1 text-base font-semibold">Select branch and register</h2>
        </div>
        <span className="rounded-full border border-border bg-surface-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Session</span>
      </div>
      <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted/60 p-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Selected</p>
        <p className="mt-1 text-sm font-semibold">{selectedRegister && selectedBranch ? `${selectedRegister.name} — ${selectedBranch.name}` : "Choose a branch and register"}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Branch</span>
          <select
            name="branchId"
            value={branchId}
            onChange={(event) => {
              const next = ensureValidSelection(event.target.value);
              setBranchId(next.branchId);
              setRegisterId(next.registerId);
            }}
            className="h-10 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"
            required
          >
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Register</span>
          <select
            name="registerId"
            value={registerId}
            onChange={(event) => setRegisterId(event.target.value)}
            className="h-10 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"
            required
            disabled={visibleRegisters.length === 0}
          >
            {visibleRegisters.length === 0 ? <option value="">No active registers</option> : visibleRegisters.map((register) => <option key={register.id} value={register.id}>{register.name}</option>)}
          </select>
        </label>
      </div>
      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Opening cash</span>
        <Input name="openingBalance" type="number" min="0" step="0.01" placeholder="KSh 5,000" required />
      </label>
      <Button type="submit" disabled={pending || !branchId || !registerId} className="w-full">
        {pending ? "Opening register..." : "Open register"}
      </Button>
    </form>
  );
}
