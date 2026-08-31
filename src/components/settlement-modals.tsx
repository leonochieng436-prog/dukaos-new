"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recordCustomerPayment } from "@/app/actions/customers";
import { refundSale } from "@/app/actions/sales";
import { Button } from "@/components/ui/button";

export function CustomerPaymentModalForm({ customers }: { customers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "mpesa" | "bank" | "card" | "other">("cash");
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!customerId || !amount) return;

    startTransition(async () => {
      const result = await recordCustomerPayment({ customerId, amount, method, reference });
      if (result.ok) {
        setOpen(false);
        setCustomerId("");
        setAmount("");
        setMethod("cash");
        setReference("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="w-full">Record payment</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Record customer payment">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Receive payment</p>
                <h3 className="mt-1 text-lg font-semibold">Customer settlement</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="mb-2 block text-muted-foreground">Customer</span>
                <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} required className="h-10 w-full rounded border border-border-strong bg-surface px-2 text-sm">
                  <option value="">Customer...</option>
                  {customers.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-2 block text-muted-foreground">Amount</span>
                <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.01" step="0.01" placeholder="Amount" required className="h-10 w-full rounded border border-border-strong bg-surface px-3 text-sm" />
              </label>

              <label className="block text-sm">
                <span className="mb-2 block text-muted-foreground">Payment method</span>
                <select value={method} onChange={(event) => setMethod(event.target.value as typeof method)} className="h-10 w-full rounded border border-border-strong bg-surface px-2 text-sm">
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-2 block text-muted-foreground">Reference</span>
                <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Receipt / transaction reference" className="h-10 w-full rounded border border-border-strong bg-surface px-3 text-sm" />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={submit} disabled={pending || !customerId || !amount}>
                  {pending ? "Saving..." : "Confirm payment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function RefundSaleModalForm({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "store_credit" | "original_payment_method">("original_payment_method");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await refundSale({ saleId, reason, refundMethod });
      if (result.ok) {
        setOpen(false);
        setReason("");
        setRefundMethod("original_payment_method");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="w-full">Refund sale</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Refund sale">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Refund</p>
                <h3 className="mt-1 text-lg font-semibold">Process a sale refund</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="mb-2 block text-muted-foreground">Refund reason</span>
                <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Customer requested refund" className="h-10 w-full rounded border border-border-strong bg-surface px-3 text-sm" />
              </label>

              <label className="block text-sm">
                <span className="mb-2 block text-muted-foreground">Refund method</span>
                <select value={refundMethod} onChange={(event) => setRefundMethod(event.target.value as typeof refundMethod)} className="h-10 w-full rounded border border-border-strong bg-surface px-2 text-sm">
                  <option value="cash">Cash</option>
                  <option value="store_credit">Store credit</option>
                  <option value="original_payment_method">Original payment method</option>
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={submit} disabled={pending}>
                  {pending ? "Processing..." : "Confirm refund"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
