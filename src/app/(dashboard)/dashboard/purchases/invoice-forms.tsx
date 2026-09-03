"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupplierInvoice, paySupplierInvoice, recordPurchasePayment } from "@/app/actions/purchases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = { id: string; label: string; balance?: string };

export function InvoiceForm({ suppliers }: { suppliers: Option[] }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  function submit(formData: FormData) { startTransition(async () => { const result = await createSupplierInvoice(Object.fromEntries(formData.entries())); if (result.ok) { (document.getElementById("invoice-form") as HTMLFormElement)?.reset(); router.refresh(); } }); }
  return <form id="invoice-form" action={submit} className="grid gap-2 sm:grid-cols-5"><select name="supplierId" required className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="">Supplier...</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><Input name="invoiceNumber" placeholder="Invoice number" required /><Input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" required /><Input name="dueDate" type="date" /><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Add invoice"}</Button></form>;
}

export function PaymentForm({ invoices }: { invoices: Option[] }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  function submit(formData: FormData) { startTransition(async () => { const result = await paySupplierInvoice(Object.fromEntries(formData.entries())); if (result.ok) { (document.getElementById("payment-form") as HTMLFormElement)?.reset(); router.refresh(); } }); }
  return <form id="payment-form" action={submit} className="grid gap-2 sm:grid-cols-4"><select name="invoiceId" required className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="">Invoice...</option>{invoices.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><Input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" required /><select name="method" defaultValue="cash" className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="cheque">Cheque</option></select><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Record payment"}</Button></form>;
}

export function PurchasePaymentForm({ purchases }: { purchases: Option[] }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  const [selectedPurchase, setSelectedPurchase] = useState("");
  const [amount, setAmount] = useState("");
  function submit(formData: FormData) { startTransition(async () => { const result = await recordPurchasePayment(Object.fromEntries(formData.entries())); if (result.ok) { (document.getElementById("purchase-payment-form") as HTMLFormElement)?.reset(); router.refresh(); } }); }
  return <form id="purchase-payment-form" action={submit} className="grid gap-2 sm:grid-cols-5"><select name="purchaseId" required value={selectedPurchase} onChange={(event) => { const purchaseId = event.target.value; setSelectedPurchase(purchaseId); setAmount(purchases.find((item) => item.id === purchaseId)?.balance ?? ""); }} className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="">Purchase...</option>{purchases.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><Input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" required value={amount} onChange={(event) => setAmount(event.target.value)} /><select name="method" defaultValue="cash" className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="cheque">Cheque</option></select><Input name="reference" placeholder="Payment reference" /><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Record payment"}</Button></form>;
}
