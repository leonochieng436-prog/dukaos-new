"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDirectPurchase } from "@/app/actions/purchases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string };
type Warehouse = Option & { branchId: string };
type Variant = { id: string; label: string; cost: string };
type Row = { variantId: string; quantity: string; unitCost: string };

export function DirectPurchaseForm({ suppliers, branches, warehouses, variants, today }: { suppliers: Option[]; branches: Option[]; warehouses: Warehouse[]; variants: Variant[]; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [branchId, setBranchId] = useState("");
  const [rows, setRows] = useState<Row[]>([{ variantId: "", quantity: "1", unitCost: "" }]);

  function updateRow(index: number, key: keyof Row, value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value, ...(key === "variantId" && !row.unitCost ? { unitCost: variants.find((item) => item.id === value)?.cost ?? "" } : {}) } : row));
  }

  function submit(formData: FormData) {
    setError("");
    const payload = { supplierId: String(formData.get("supplierId") || ""), branchId, warehouseId: String(formData.get("warehouseId") || ""), purchaseDate: String(formData.get("purchaseDate") || ""), invoiceNumber: String(formData.get("invoiceNumber") || ""), amountPaid: String(formData.get("amountPaid") || "0"), paymentMethod: String(formData.get("paymentMethod") || "cash"), paymentDate: String(formData.get("paymentDate") || ""), items: rows };
    startTransition(async () => {
      const result = await createDirectPurchase(payload);
      if (!result.ok) return setError(result.error);
      setRows([{ variantId: "", quantity: "1", unitCost: "" }]);
      router.refresh();
    });
  }

  const total = rows.reduce((sum, row) => sum + (Number(row.quantity) * Number(row.unitCost) || 0), 0);
  return (
    <form action={submit} className="space-y-5">
      {error && <p className="rounded-[var(--radius-sm)] bg-danger-tint px-3 py-2 text-[13px] text-danger">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1"><Label htmlFor="purchase-supplier">Supplier *</Label><select id="purchase-supplier" name="supplierId" required className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"><option value="">Select supplier...</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="space-y-1"><Label htmlFor="purchase-branch">Branch *</Label><select id="purchase-branch" name="branchId" required value={branchId} onChange={(event) => setBranchId(event.target.value)} className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"><option value="">Select branch...</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="space-y-1"><Label htmlFor="purchase-warehouse">Warehouse *</Label><select id="purchase-warehouse" name="warehouseId" required className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"><option value="">Select warehouse...</option>{warehouses.filter((item) => !branchId || item.branchId === branchId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="space-y-1"><Label htmlFor="purchase-date">Purchase date *</Label><Input id="purchase-date" name="purchaseDate" type="date" defaultValue={today} required /></div>
        <div className="space-y-1"><Label htmlFor="purchase-invoice">Supplier invoice no.</Label><Input id="purchase-invoice" name="invoiceNumber" placeholder="e.g. ABC-45891" /></div>
        <div className="space-y-1"><Label htmlFor="purchase-payment-date">Payment date</Label><Input id="purchase-payment-date" name="paymentDate" type="date" /></div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><div><h4 className="text-sm font-semibold">Products received</h4><p className="text-[12px] text-muted-foreground">Stock is added immediately using the actual buying price.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => setRows((current) => [...current, { variantId: "", quantity: "1", unitCost: "" }])}>Add product</Button></div>
        <div className="hidden grid-cols-[1fr_110px_140px_120px_auto] gap-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid"><span>Product</span><span>Quantity</span><span>Buying price</span><span>Total</span><span /></div>
        {rows.map((row, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_110px_140px_120px_auto] sm:items-center"><select value={row.variantId} onChange={(event) => updateRow(index, "variantId", event.target.value)} required className="h-9 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"><option value="">Select product...</option>{variants.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><Input type="number" min="0.001" step="0.001" value={row.quantity} onChange={(event) => updateRow(index, "quantity", event.target.value)} required /><Input type="number" min="0" step="0.01" value={row.unitCost} onChange={(event) => updateRow(index, "unitCost", event.target.value)} required /><p className="text-sm font-semibold font-tabular">KES {((Number(row.quantity) * Number(row.unitCost)) || 0).toFixed(2)}</p><Button type="button" variant="secondary" size="sm" onClick={() => setRows((current) => current.length === 1 ? current : current.filter((_, rowIndex) => rowIndex !== index))}>Remove</Button></div>)}
      </div>
      <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-[1fr_220px_180px]"><div><p className="text-[12px] text-muted-foreground">Purchase total</p><p className="mt-1 text-xl font-semibold font-tabular">KES {total.toFixed(2)}</p><p className="mt-1 text-[12px] text-muted-foreground">Payment status is calculated from amount paid.</p></div><div className="space-y-1"><Label htmlFor="purchase-amount-paid">Amount paid</Label><Input id="purchase-amount-paid" name="amountPaid" type="number" min="0" step="0.01" defaultValue="0" /><p className="text-[11px] text-muted-foreground">Enter 0 for supplier credit.</p></div><div className="space-y-1"><Label htmlFor="purchase-payment-method">Payment method</Label><select id="purchase-payment-method" name="paymentMethod" defaultValue="cash" className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="cheque">Cheque</option></select></div></div>
      <Button type="submit" disabled={pending}>{pending ? "Saving purchase..." : "Save purchase and receive stock"}</Button>
    </form>
  );
}
