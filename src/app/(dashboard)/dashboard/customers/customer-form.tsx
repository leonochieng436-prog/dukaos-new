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

export function ClearCustomerBalanceForm({ customerId, customerName, balance }: { customerId: string; customerName: string; balance?: number }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "mpesa" | "bank" | "card" | "other">("cash");
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  const [splitMethod, setSplitMethod] = useState<"cash" | "mpesa" | "bank" | "card" | "other">("mpesa");
  const [splitAmount, setSplitAmount] = useState("");
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const balanceNum = balance ?? 0;
  const firstAmount = paymentAmount ? parseFloat(paymentAmount) : balanceNum;
  const secondAmount = splitAmount ? parseFloat(splitAmount) : 0;
  const totalAmount = firstAmount + secondAmount;
  const isValid = balanceNum > 0 && firstAmount > 0 && firstAmount <= balanceNum && (!useSplitPayment || (splitAmount && secondAmount > 0 && totalAmount <= balanceNum));

  function submit() {
    if (!isValid) return;
    setError("");

    startTransition(async () => {
      const result = await clearCustomerBalance({
        customerId,
        method,
        amount: paymentAmount || balanceNum.toString(),
        reference: useSplitPayment ? `Split payment: ${firstAmount.toFixed(2)} ${method} + ${secondAmount.toFixed(2)} ${splitMethod}` : undefined,
        splitMethod: useSplitPayment ? splitMethod : undefined,
        splitAmount: useSplitPayment ? splitAmount : undefined,
      });
      
      if (result.ok) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setPaymentAmount("");
          setSplitAmount("");
          setUseSplitPayment(false);
          setSuccess(false);
          router.refresh();
        }, 1500);
      } else {
        setError(result.error);
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
            {success ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-tint">
                  <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold">Balance cleared successfully!</p>
                <p className="mt-1 text-xs text-muted-foreground">KES {totalAmount.toFixed(2)} received</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Clear balance</p>
                    <h3 className="mt-1 text-lg font-semibold">{customerName}</h3>
                    {balanceNum > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Outstanding: <span className="font-semibold text-foreground">KES {balanceNum.toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => setIsOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
                </div>

                {error && (
                  <div className="mt-4 rounded-lg border border-danger-tint bg-danger-tint/30 p-3">
                    <p className="text-xs font-medium text-danger">{error}</p>
                  </div>
                )}

                <div className="mt-4 space-y-4">
                  <label className="block text-sm">
                    <span className="mb-2 block text-muted-foreground">Payment amount</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={balanceNum}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={`0.00 (leave blank for full: ${balanceNum.toFixed(2)})`}
                      className="h-10 w-full rounded border border-border-strong bg-surface px-2 text-sm"
                      disabled={pending}
                    />
                    {paymentAmount && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Will pay KES {parseFloat(paymentAmount).toFixed(2)} of KES {balanceNum.toFixed(2)}
                      </p>
                    )}
                  </label>

                  <label className="block text-sm">
                    <span className="mb-2 block text-muted-foreground">Payment method (1)</span>
                    <select value={method} onChange={(event) => setMethod(event.target.value as "cash" | "mpesa" | "bank" | "card" | "other")} className="h-10 w-full rounded border border-border-strong bg-surface px-2 text-sm" disabled={pending}>
                      <option value="cash">Cash</option>
                      <option value="mpesa">M-Pesa</option>
                      <option value="bank">Bank</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useSplitPayment}
                      onChange={(e) => setUseSplitPayment(e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                      disabled={pending}
                    />
                    <span className="text-muted-foreground">Split payment (use two payment methods)</span>
                  </label>

                  {useSplitPayment && (
                    <div className="space-y-3 rounded-lg border border-border-strong bg-surface-muted p-3">
                      <label className="block text-sm">
                        <span className="mb-2 block text-muted-foreground">Second method amount</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={splitAmount}
                          onChange={(e) => setSplitAmount(e.target.value)}
                          placeholder="Amount for second method"
                          className="h-10 w-full rounded border border-border-strong bg-surface px-2 text-sm"
                          disabled={pending}
                        />
                      </label>

                      <label className="block text-sm">
                        <span className="mb-2 block text-muted-foreground">Payment method (2)</span>
                        <select value={splitMethod} onChange={(event) => setSplitMethod(event.target.value as "cash" | "mpesa" | "bank" | "card" | "other")} className="h-10 w-full rounded border border-border-strong bg-surface px-2 text-sm" disabled={pending}>
                          <option value="cash">Cash</option>
                          <option value="mpesa">M-Pesa</option>
                          <option value="bank">Bank</option>
                          <option value="card">Card</option>
                          <option value="other">Other</option>
                        </select>
                      </label>

                      {firstAmount > 0 && secondAmount > 0 && (
                        <div className="rounded-sm border border-border-strong bg-surface p-2 text-xs">
                          <p className="mb-1 font-medium">Payment breakdown:</p>
                          <p className="text-muted-foreground">
                            • {method}: KES {firstAmount.toFixed(2)}
                          </p>
                          <p className="text-muted-foreground">
                            • {splitMethod}: KES {secondAmount.toFixed(2)}
                          </p>
                          <p className="mt-1 border-t border-border pt-1 font-semibold">Total: KES {totalAmount.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setIsOpen(false)} disabled={pending}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={submit} disabled={pending || !isValid}>
                      {pending ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Clearing...
                        </span>
                      ) : (
                        "Confirm clear"
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
