"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addStock } from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";

export function AddStockModal({
  open,
  onOpenChange,
  productName,
  variantId,
  variantLabel,
  warehouses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  variantId: string;
  variantLabel: string;
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("Manual stock addition");

  if (!open) return null;

  function resetForm() {
    setError(null);
    setQuantity("");
    setUnitCost("");
    setReason("Manual stock addition");
    setWarehouseId(warehouses[0]?.id ?? "");
  }

  function handleClose() {
    resetForm();
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!warehouseId || !variantId || !quantity || !unitCost) {
      setError("Please fill in the warehouse, quantity, and unit cost.");
      return;
    }

    startTransition(async () => {
      const result = await addStock({
        warehouseId,
        variantId,
        quantity,
        unitCost,
        reason,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      handleClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Add stock">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Stock in</p>
            <h3 className="mt-1 text-lg font-semibold">Add stock</h3>
          </div>
          <button type="button" onClick={handleClose} className="text-sm text-muted-foreground hover:text-foreground">
            Close
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-[var(--radius-sm)] border border-border-strong bg-surface-muted p-3 text-sm">
            <div className="font-medium text-foreground">{productName}</div>
            <div className="mt-1 text-muted-foreground">{variantLabel}</div>
          </div>

          {error && (
            <div className="rounded-[var(--radius-sm)] bg-danger-tint px-3 py-2 text-[13px] text-danger">
              {error}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-2 block text-muted-foreground">Warehouse</span>
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="h-10 w-full rounded border border-border-strong bg-surface px-2 text-sm"
            >
              <option value="">Select warehouse…</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-2 block text-muted-foreground">Quantity</span>
            <input
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              type="number"
              min="0.001"
              step="0.001"
              placeholder="25"
              className="h-10 w-full rounded border border-border-strong bg-surface px-3 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-2 block text-muted-foreground">Unit cost (KES)</span>
            <input
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="85.00"
              className="h-10 w-full rounded border border-border-strong bg-surface px-3 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-2 block text-muted-foreground">Note</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Manual stock addition"
              className="h-10 w-full rounded border border-border-strong bg-surface px-3 text-sm"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSubmit} disabled={isPending || !warehouseId || !quantity || !unitCost}>
              {isPending ? "Saving..." : "Add stock"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
