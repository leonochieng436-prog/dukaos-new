"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearCustomerBalance, createCustomer, recordCustomerPayment } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CustomerForm() {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  function submit(formData: FormData) { startTransition(async () => { const result = await createCustomer(Object.fromEntries(formData.entries())); if (result.ok) { (document.getElementById("customer-form") as HTMLFormElement)?.reset(); router.refresh(); } }); }
  return <form id="customer-form" action={submit} className="grid gap-2 sm:grid-cols-4"><Input name="name" placeholder="Customer name" required /><Input name="phone" placeholder="Phone" /><Input name="email" type="email" placeholder="Email" /><Input name="creditLimit" type="number" min="0" step="0.01" placeholder="Credit limit" required /><select name="category" defaultValue="REGULAR" className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="NEW">New</option><option value="REGULAR">Regular</option><option value="VIP">VIP</option><option value="CREDIT">Credit</option></select><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Add customer"}</Button></form>;
}

export function CustomerPaymentForm({ customers }: { customers: { id: string; name: string }[] }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  function submit(formData: FormData) { startTransition(async () => { const result = await recordCustomerPayment(Object.fromEntries(formData.entries())); if (result.ok) { (document.getElementById("customer-payment-form") as HTMLFormElement)?.reset(); router.refresh(); } }); }
  return <form id="customer-payment-form" action={submit} className="grid gap-2 sm:grid-cols-4"><select name="customerId" required className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="">Customer...</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" required /><select name="method" defaultValue="cash" className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="card">Card</option></select><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Record payment"}</Button></form>;
}

export function ClearCustomerBalanceForm({ customerId, customerName }: { customerId: string; customerName: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [method, setMethod] = useState<"cash" | "mpesa" | "bank" | "card" | "other">("cash");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await clearCustomerBalance({ customerId, method, reference: `Cleared via ${method}` });
      if (result.ok) {
        setIsOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" className="gap-2" disabled={pending} onClick={() => setIsOpen(true)}>
        {pending ? "Clearing..." : `Clear ${customerName}`}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Clear customer balance">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Clear balance</p>
                <h3 className="mt-1 text-lg font-semibold">{customerName}</h3>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="mb-2 block text-muted-foreground">Payment method</span>
                <select value={method} onChange={(event) => setMethod(event.target.value as "cash" | "mpesa" | "bank" | "card" | "other")} className="h-10 w-full rounded border border-border-strong bg-surface px-2 text-sm">
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={submit} disabled={pending}>
                  {pending ? "Clearing..." : "Confirm clear"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
