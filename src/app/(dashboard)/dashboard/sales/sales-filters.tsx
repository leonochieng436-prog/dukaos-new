"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface SalesFiltersProps {
  query: string;
  minAmount?: number;
  maxAmount?: number;
  status: string;
  paymentMethod: string;
  cashierId: string;
  dateRange: string;
  cashiers: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  salesCount: number;
  hasFilters: boolean;
}

export function SalesFilters({
  query,
  minAmount,
  maxAmount,
  status,
  paymentMethod,
  cashierId,
  dateRange,
  cashiers,
  branches,
  salesCount,
  hasFilters,
}: SalesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | number | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value))) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[0_8px_24px_rgba(18,23,26,0.04)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-3">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
            <form method="get" className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search receipt, barcode, product, customer, cashier, payment ref..."
                className="flex-1 rounded-[var(--radius-sm)] border border-border-strong bg-surface pl-10 pr-3 py-2 text-sm"
                onChange={(e) => updateFilter("q", e.target.value)}
              />
            </form>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Min amount</label>
            <input
              type="number"
              defaultValue={minAmount}
              placeholder="Min"
              step="0.01"
              min="0"
              className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-xs"
              onBlur={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                updateFilter("minAmount", value);
              }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Max amount</label>
            <input
              type="number"
              defaultValue={maxAmount}
              placeholder="Max"
              step="0.01"
              min="0"
              className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-xs"
              onBlur={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                updateFilter("maxAmount", value);
              }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <select
              defaultValue={status}
              className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-xs"
              onChange={(e) => updateFilter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PARTIALLY_RETURNED">Partially returned</option>
              <option value="VOIDED">Voided</option>
              <option value="CORRECTION_PENDING">Correction pending</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Payment</label>
            <select
              defaultValue={paymentMethod}
              className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-xs"
              onChange={(e) => updateFilter("method", e.target.value)}
            >
              <option value="">All methods</option>
              <option value="CASH">Cash</option>
              <option value="MPESA">M-Pesa</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Cashier</label>
            <select
              defaultValue={cashierId}
              className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-xs"
              onChange={(e) => updateFilter("cashierId", e.target.value)}
            >
              <option value="">All cashiers</option>
              {cashiers.map((cashier) => (
                <option key={cashier.id} value={cashier.id}>
                  {cashier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date range</label>
            <select
              defaultValue={dateRange}
              className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-xs"
              onChange={(e) => updateFilter("dateRange", e.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
          </div>
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between rounded-lg border border-border-strong bg-surface-muted p-3">
            <p className="text-xs text-muted-foreground">
              Showing {salesCount} {salesCount === 1 ? "sale" : "sales"} matching your filters
            </p>
            <a href="/dashboard/sales" className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs font-medium text-primary hover:bg-surface">
              Clear filters
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
