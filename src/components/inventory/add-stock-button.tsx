"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddStockModal } from "@/components/inventory/add-stock-modal";

export function AddStockButton({
  productName,
  variantId,
  variantLabel,
  warehouses,
}: {
  productName: string;
  variantId: string;
  variantLabel: string;
  warehouses: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Add stock
      </Button>

      <AddStockModal
        open={open}
        onOpenChange={setOpen}
        productName={productName}
        variantId={variantId}
        variantLabel={variantLabel}
        warehouses={warehouses}
      />
    </>
  );
}
