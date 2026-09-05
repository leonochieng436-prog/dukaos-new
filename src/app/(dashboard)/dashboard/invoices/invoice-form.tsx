"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoice } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Option = { id: string; name: string };
type Product = Option & { price: string };
type TaxRate = Option & { rate: string };
type Line = { description: string; quantity: string; unitPrice: string; discount: string; taxRate: string; productId: string };

const emptyLine = (): Line => ({ description: "", quantity: "1", unitPrice: "0", discount: "0", taxRate: "0", productId: "" });

export function InvoiceForm({ customers, products, taxRates, currency, issueDate, dueDate }: { customers: Option[]; products: Product[]; taxRates: TaxRate[]; currency: string; issueDate: string; dueDate: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateLine = (index: number, key: keyof Line, value: string) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line));
  const selectProduct = (index: number, productId: string) => {
    const product = products.find((item) => item.id === productId);
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, productId, description: product?.name || line.description, unitPrice: product?.price || line.unitPrice } : line));
  };
  const submit = (formData: FormData) => {
    setError(null); setSuccess(null);
    formData.set("items", JSON.stringify(lines));
    startTransition(async () => {
      const result = await createInvoice(formData);
      if (!result.ok) { setError(result.error); return; }
      setSuccess("Invoice saved.");
      router.push(`/dashboard/invoices/${result.data.id}`);
      router.refresh();
    });
  };

  return (
    <form action={submit} className="space-y-5">
      {error && <div className="rounded-[var(--radius-sm)] bg-danger-tint px-3 py-2 text-sm text-danger">{error}</div>}
      {success && <div className="rounded-[var(--radius-sm)] bg-success-tint px-3 py-2 text-sm text-success">{success}</div>}
      <Card>
        <CardHeader><CardTitle>Invoice details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="customerId">Customer</Label><select id="customerId" name="customerId" required className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="currency">Currency</Label><Input id="currency" name="currency" defaultValue={currency} maxLength={3} /></div>
          <div className="space-y-1.5"><Label htmlFor="issueDate">Issue date</Label><Input id="issueDate" name="issueDate" type="date" defaultValue={issueDate} required /></div>
          <div className="space-y-1.5"><Label htmlFor="dueDate">Due date</Label><Input id="dueDate" name="dueDate" type="date" defaultValue={dueDate} required /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle>Items</CardTitle><Button type="button" variant="secondary" size="sm" onClick={() => setLines((current) => [...current, emptyLine()])}>Add item</Button></div></CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, index) => <div key={index} className="grid gap-2 rounded-[var(--radius-sm)] border border-border bg-background p-3 sm:grid-cols-[1.4fr_1.1fr_0.55fr_0.75fr_0.75fr_auto]">
            <div className="space-y-1"><Label>Description</Label><Input value={line.description} onChange={(event) => updateLine(index, "description", event.target.value)} placeholder="Website design or product" /></div>
            <div className="space-y-1"><Label>Product (optional)</Label><select value={line.productId} onChange={(event) => selectProduct(index, event.target.value)} className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-sm"><option value="">Service / custom</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div>
            <div className="space-y-1"><Label>Qty</Label><Input value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} type="number" min="0.001" step="0.001" /></div>
            <div className="space-y-1"><Label>Rate</Label><Input value={line.unitPrice} onChange={(event) => updateLine(index, "unitPrice", event.target.value)} type="number" min="0" step="0.01" /></div>
            <div className="space-y-1"><Label>Tax %</Label><select value={line.taxRate} onChange={(event) => updateLine(index, "taxRate", event.target.value)} className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-sm"><option value="0">No tax</option>{taxRates.map((tax) => <option key={tax.id} value={tax.rate}>{tax.name} ({tax.rate}%)</option>)}</select></div>
            <div className="flex items-end"><Button type="button" variant="ghost" size="icon" aria-label="Remove item" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>×</Button></div>
          </div>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Notes and payment instructions</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="notes">Notes</Label><textarea id="notes" name="notes" rows={3} placeholder="Thank you for your business" className="w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 py-2 text-sm" /></div><div className="space-y-1.5"><Label htmlFor="paymentInstructions">Payment instructions</Label><textarea id="paymentInstructions" name="paymentInstructions" rows={3} placeholder="Pay via M-Pesa or bank transfer" className="w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 py-2 text-sm" /></div></CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2"><Button type="submit" name="intent" value="draft" variant="secondary" disabled={isPending}>Save draft</Button><Button type="submit" name="intent" value="send" disabled={isPending}>Save and send</Button></div>
    </form>
  );
}