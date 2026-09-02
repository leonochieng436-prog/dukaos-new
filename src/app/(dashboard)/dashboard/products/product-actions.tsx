"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { AddStockModal } from "@/components/inventory/add-stock-modal";

export function ProductActions({
  productId,
  productName,
  variantId,
  variantLabel,
  warehouses,
}: {
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleDelete() {
    if (!window.confirm("Archive this product? It will no longer appear in active stock workflows.")) return;
    setError(null);
    setOpen(false);
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Open product actions"
        onClick={() => setOpen((current) => !current)}
        className="grid h-8 w-8 place-items-center rounded border border-border-strong bg-surface text-lg leading-none text-muted-foreground transition hover:border-border hover:text-foreground"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-44 rounded border border-border bg-surface shadow-lg">
          <div className="py-1">
            <Link href={`/dashboard/products/${productId}`} className="block px-3 py-2 text-sm text-foreground hover:bg-surface-muted" onClick={() => setOpen(false)}>
              View product
            </Link>
            <Link href={`/dashboard/products/${productId}`} className="block px-3 py-2 text-sm text-foreground hover:bg-surface-muted" onClick={() => setOpen(false)}>
              Edit product
            </Link>
            {variantId && (
              <button
                type="button"
                onClick={() => {
                  setModalOpen(true);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-muted"
              >
                Add stock
              </button>
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-tint disabled:opacity-50"
            >
              {isPending ? "Archiving..." : "Delete"}
            </button>
          </div>
        </div>
      )}

      {variantId && variantLabel && (
        <AddStockModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          productName={productName}
          variantId={variantId}
          variantLabel={variantLabel}
          warehouses={warehouses}
        />
      )}

      {error && <div className="mt-2 text-[12px] text-danger">{error}</div>}
    </div>
  );
}
