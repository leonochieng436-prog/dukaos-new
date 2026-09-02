"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Barcode, Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import Decimal from "decimal.js";
import { createSale } from "@/app/actions/sales";
import { buildReceiptPreview } from "@/lib/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = { id: string; name: string; branchId?: string };
type Variant = { id: string; name: string; label: string; sku: string; price: string; imageUrl: string | null; category: string; stockByWarehouse: { warehouseId: string; quantity: string }[] };
type CartLine = { variantId: string; quantity: number };

export function PosForm({ branches, warehouses, registers, variants, customers, activeSession }: { branches: Option[]; warehouses: Option[]; registers: Option[]; variants: Variant[]; customers: Option[]; activeSession?: { branchId: string; registerId: string } | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const activeBranchId = activeSession?.branchId ?? branches[0]?.id ?? "";
  const activeRegisterId = activeSession?.registerId ?? registers.find((item) => item.branchId === activeBranchId)?.id ?? "";
  const [branchId, setBranchId] = useState(activeBranchId);
  const [registerId, setRegisterId] = useState(activeRegisterId);
  const [warehouseId, setWarehouseId] = useState(warehouses.find((item) => item.branchId === activeBranchId)?.id ?? "");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All products");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MPESA" | "CARD" | "BANK_TRANSFER" | "CREDIT" | "OTHER">("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [splitPayment, setSplitPayment] = useState(false);
  const [secondPaymentMethod, setSecondPaymentMethod] = useState<typeof paymentMethod>("MPESA");
  const [secondPaymentAmount, setSecondPaymentAmount] = useState("");
  const [customerId, setCustomerId] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const resolvedBranchId = activeSession ? activeSession.branchId : branchId;
  const resolvedRegisterId = activeSession ? activeSession.registerId : registerId;
  const visibleWarehouses = warehouses.filter((item) => item.branchId === resolvedBranchId);
  const visibleRegisters = registers.filter((item) => item.branchId === resolvedBranchId);
  const categories = ["All products", ...Array.from(new Set(variants.map((item) => item.category)))];
  const filteredVariants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return variants.filter((item) => (category === "All products" || item.category === category) && (!query || `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(query)));
  }, [category, search, variants]);
  const cartLines = cart.map((line) => ({ ...line, variant: variants.find((item) => item.id === line.variantId)! })).filter((line) => line.variant);
  const stockFor = (variant: Variant) => new Decimal(variant.stockByWarehouse.find((item) => item.warehouseId === warehouseId)?.quantity ?? 0);
  const total = cartLines.reduce((sum, line) => sum.plus(new Decimal(line.variant.price).times(line.quantity)), new Decimal(0));
  const received = new Decimal(amountPaid || 0);
  const secondReceived = new Decimal(secondPaymentAmount || 0);
  const receivedTotal = received.plus(splitPayment ? secondReceived : 0);
  const change = Decimal.max(receivedTotal.minus(total), 0);

  function addToCart(variantId: string) {
    setCart((current) => {
      const existing = current.find((line) => line.variantId === variantId);
      const variant = variants.find((item) => item.id === variantId);
      if (!variant || stockFor(variant).lessThanOrEqualTo(existing?.quantity ?? 0)) return current;
      return existing ? current.map((line) => line.variantId === variantId ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { variantId, quantity: 1 }];
    });
  }
  function adjustQuantity(variantId: string, delta: number) {
    setCart((current) => current.map((line) => {
      if (line.variantId !== variantId) return line;
      const variant = variants.find((item) => item.id === variantId);
      const maximum = variant ? stockFor(variant).toNumber() : line.quantity;
      return { ...line, quantity: Math.min(maximum, Math.max(0, line.quantity + delta)) };
    }).filter((line) => line.quantity > 0));
  }
  function setQuantity(variantId: string, value: string) {
    const quantity = Number(value);
    if (!Number.isFinite(quantity)) return;
    setCart((current) => current.map((line) => {
      if (line.variantId !== variantId) return line;
      const variant = variants.find((item) => item.id === variantId);
      const maximum = variant ? stockFor(variant).toNumber() : line.quantity;
      return { ...line, quantity: Math.min(maximum, Math.max(0, quantity)) };
    }).filter((line) => line.quantity > 0));
  }
  function previewReceipt() {
    if (cartLines.length === 0) return;
    const previewPaymentMethod = splitPayment ? `${paymentMethod} + ${secondPaymentMethod}` : paymentMethod;
    const previewAmountPaid = splitPayment ? new Decimal(amountPaid || "0").plus(secondReceived).toFixed(2) : amountPaid || total.toString();
    const preview = buildReceiptPreview({
      customerName: customers.find((item) => item.id === customerId)?.name ?? "Walk-in customer",
      paymentMethod: previewPaymentMethod,
      amountPaid: previewAmountPaid,
      total: total.toString(),
      items: cartLines.map((line) => ({
        name: line.variant.label,
        quantity: line.quantity,
        unitPrice: line.variant.price,
        total: new Decimal(line.variant.price).times(line.quantity).toFixed(2),
      })),
    });

    const receiptWindow = window.open("", "_blank", "width=420,height=900");
    if (!receiptWindow) return;

    receiptWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt preview</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111;background:#fff}h2{margin:0 0 12px;font-size:22px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:6px 0;text-align:left;border-bottom:1px solid #ddd;font-size:12px}td:last-child,th:last-child{text-align:right}dl{display:grid;grid-template-columns:1fr auto;gap:6px 12px;font-size:12px}dd{margin:0;text-align:right}.total{font-weight:700;font-size:16px;margin-top:12px}</style></head><body><h2>Receipt Preview</h2><dl><dt>Customer</dt><dd>${preview.customerName}</dd><dt>Payment</dt><dd>${preview.paymentMethod}</dd><dt>Amount paid</dt><dd>KES ${preview.amountPaid}</dd><dt>Change</dt><dd>KES ${preview.changeGiven}</dd></dl><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${preview.items.map((item) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>KES ${new Decimal(item.unitPrice).toFixed(2)}</td><td>KES ${new Decimal(item.total).toFixed(2)}</td></tr>`).join("")}</tbody></table><div class="total">Total: KES ${preview.total}</div></body></html>`);
    receiptWindow.document.close();
    receiptWindow.focus();
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const isCreditMethod = (method: string) => method === "CREDIT";
    const creditSale = isCreditMethod(paymentMethod) || (splitPayment && (isCreditMethod(paymentMethod) || isCreditMethod(secondPaymentMethod)));
    if (creditSale && !customerId) {
      setError("Select or add a customer before completing a credit sale.");
      return;
    }

    const paymentEntries: Array<{ method: "CASH" | "MPESA" | "CARD" | "BANK_TRANSFER" | "CREDIT" | "OTHER"; amount: string }> = [];
    if (splitPayment) {
      if (paymentMethod !== "CREDIT") paymentEntries.push({ method: paymentMethod, amount: amountPaid || "0" });
      if (secondPaymentMethod !== "CREDIT") paymentEntries.push({ method: secondPaymentMethod, amount: secondPaymentAmount || "0" });
      const cashTotal = paymentEntries.reduce((sum, entry) => sum.plus(entry.amount), new Decimal(0));
      if (paymentMethod === "CREDIT" || secondPaymentMethod === "CREDIT") {
        paymentEntries.push({ method: "CREDIT", amount: Decimal.max(total.minus(cashTotal), 0).toFixed(2) });
      }
    } else if (paymentMethod === "CREDIT") {
      paymentEntries.push({ method: "CREDIT", amount: total.toFixed(2) });
    } else {
      paymentEntries.push({ method: paymentMethod, amount: amountPaid || total.toString() });
    }

    const data = new FormData(event.currentTarget);
    const payload = {
      branchId: resolvedBranchId,
      registerId: activeSession ? activeSession.registerId : String(data.get("registerId") || resolvedRegisterId),
      warehouseId,
      customerId,
      paymentMethod: creditSale ? "CREDIT" : paymentMethod,
      amountPaid: paymentEntries.filter((entry) => entry.method !== "CREDIT").reduce((sum, entry) => sum.plus(entry.amount), new Decimal(0)).toFixed(2),
      payments: paymentEntries,
      items: cart.map((line) => ({ variantId: line.variantId, quantity: String(line.quantity) })),
    };
    startTransition(async () => {
      const result = await createSale(payload);
      if (!result.ok) return setError(result.error);
      setCart([]); setAmountPaid(""); setSecondPaymentAmount(""); setSplitPayment(false); setCustomerId("");
      if (creditSale) {
        setSuccess("Credit sale saved and added to the credit ledger. You can continue with the next sale.");
        router.refresh();
        return;
      }
      router.push(`/dashboard/pos/receipts/${result.data.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="min-w-0 space-y-4">
        <div className="flex gap-2"><div className="relative flex-1"><Search size={17} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, SKU or barcode..." className="h-11 pl-10" autoFocus /></div><Button type="button" variant="secondary" size="icon" title="Barcode scanner"><Barcode size={18} /></Button></div>
        <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${category === item ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface text-muted-foreground hover:border-primary hover:text-primary"}`}>{item}</button>)}</div>
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Product catalog</h2><p className="mt-1 text-[12px] text-muted-foreground">{filteredVariants.length} products available</p></div><span className="text-[12px] text-muted-foreground">Click a product to add it</span></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
          {filteredVariants.map((variant) => {
            const stock = stockFor(variant);
            return <button key={variant.id} type="button" onClick={() => addToCart(variant.id)} disabled={stock.lessThanOrEqualTo(0)} className="group overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_20px_rgba(18,23,26,0.08)] disabled:cursor-not-allowed disabled:opacity-55"><div className="relative flex aspect-[4/3] items-center justify-center bg-surface-muted">{variant.imageUrl ? <img src={variant.imageUrl} alt="" className="h-full w-full object-cover" /> : <ShoppingCart size={28} className="text-border-strong" />}<span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold ${stock.lessThanOrEqualTo(0) ? "bg-danger-tint text-danger" : stock.lessThanOrEqualTo(5) ? "bg-warning-tint text-warning" : "bg-success-tint text-success"}`}>{stock.lessThanOrEqualTo(0) ? "Out of stock" : `${stock.toFixed(0)} in stock`}</span></div><div className="p-3"><p className="truncate text-sm font-semibold">{variant.label}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">SKU {variant.sku}</p><div className="mt-3 flex items-center justify-between"><span className="font-tabular text-sm font-semibold text-primary">KES {new Decimal(variant.price).toFixed(2)}</span><span className="grid h-7 w-7 place-items-center rounded-full bg-primary-tint text-primary transition-colors group-hover:bg-primary group-hover:text-white"><Plus size={15} /></span></div></div></button>;
          })}
        </div>
        {filteredVariants.length === 0 && <div className="rounded-[var(--radius-md)] border border-dashed border-border-strong px-5 py-12 text-center text-sm text-muted-foreground">No matching products.</div>}
      </section>
      <aside className="sticky top-5 rounded-[var(--radius-lg)] border border-border bg-surface shadow-[0_8px_24px_rgba(18,23,26,0.06)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-sm font-semibold">Current sale</h2><p className="mt-1 text-[12px] text-muted-foreground">{cartLines.reduce((sum, line) => sum + line.quantity, 0)} items</p></div>{cartLines.length > 0 && <button type="button" onClick={() => setCart([])} className="text-[12px] font-medium text-danger hover:underline">Clear</button>}</div>
        <div className="max-h-[310px] min-h-[120px] overflow-y-auto px-5">{cartLines.length === 0 ? <div className="flex min-h-[150px] flex-col items-center justify-center text-center"><ShoppingCart size={24} className="text-border-strong" /><p className="mt-3 text-sm font-medium text-muted-foreground">Your sale is empty</p><p className="mt-1 text-[12px] text-muted-foreground">Select products from the catalog</p></div> : cartLines.map((line) => <div key={line.variantId} className="flex gap-3 border-b border-border py-3 last:border-0"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{line.variant.label}</p><p className="mt-1 font-tabular text-[12px] text-muted-foreground">KES {new Decimal(line.variant.price).toFixed(2)} each</p><div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => adjustQuantity(line.variantId, -1)} className="grid h-6 w-6 place-items-center rounded border border-border-strong text-muted-foreground hover:border-primary hover:text-primary"><Minus size={13} /></button><Input aria-label={`Quantity for ${line.variant.label}`} value={line.quantity} onChange={(event) => setQuantity(line.variantId, event.target.value)} type="number" min="0" max={stockFor(line.variant).toString()} step="1" className="h-6 w-12 px-1 text-center text-xs" /><button type="button" onClick={() => adjustQuantity(line.variantId, 1)} className="grid h-6 w-6 place-items-center rounded border border-border-strong text-muted-foreground hover:border-primary hover:text-primary"><Plus size={13} /></button><button type="button" onClick={() => setCart((current) => current.filter((item) => item.variantId !== line.variantId))} className="ml-1 text-muted-foreground hover:text-danger"><Trash2 size={14} /></button></div></div><p className="font-tabular text-sm font-semibold">KES {new Decimal(line.variant.price).times(line.quantity).toFixed(2)}</p></div>)}</div>
        <div className="border-t border-border px-5 py-4"><div className="space-y-2 text-sm"><div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="font-tabular">KES {total.toFixed(2)}</span></div><div className="flex justify-between text-muted-foreground"><span>Tax</span><span className="font-tabular">KES 0.00</span></div><div className="mt-3 flex items-end justify-between border-t border-border pt-3"><span className="font-semibold">Total</span><span className="font-tabular text-2xl font-bold text-primary">KES {total.toFixed(2)}</span></div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{!activeSession && <select name="registerId" value={registerId} onChange={(event) => setRegisterId(event.target.value)} required className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="">Register...</option>{visibleRegisters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}{activeSession && <div className="rounded border border-border-strong bg-surface-muted px-2 py-2 text-sm"><span className="text-muted-foreground">Register</span><p className="mt-1 font-medium">{registers.find((item) => item.id === activeSession.registerId)?.name ?? "Current register"}</p></div>}<select name="warehouseId" value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setCart([]); }} required className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="">Warehouse...</option>{visibleWarehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{!activeSession && <select value={branchId} onChange={(event) => { const nextBranchId = event.target.value; setBranchId(nextBranchId); setRegisterId(registers.find((item) => item.branchId === nextBranchId)?.id ?? ""); setWarehouseId(warehouses.find((item) => item.branchId === nextBranchId)?.id ?? ""); setCart([]); }} className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="">Branch...</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}{activeSession && <div className="rounded border border-border-strong bg-surface-muted px-2 py-2 text-sm"><span className="text-muted-foreground">Branch</span><p className="mt-1 font-medium">{branches.find((item) => item.id === activeSession.branchId)?.name ?? "Current branch"}</p></div>}<select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-9 rounded border border-border-strong bg-surface px-2 text-sm"><option value="">Walk-in customer</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div className="mt-4"><p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Payment method</p><div className="grid grid-cols-2 gap-2">{(["CASH", "MPESA", "CARD", "BANK_TRANSFER", "CREDIT"] as const).map((method) => <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`rounded border px-2 py-2 text-[11px] font-semibold ${paymentMethod === method ? "border-primary bg-primary-tint text-primary" : "border-border-strong text-muted-foreground hover:border-primary"}`}>{method === "BANK_TRANSFER" ? "Bank" : method === "MPESA" ? "M-Pesa" : method === "CREDIT" ? "Credit sale" : method[0] + method.slice(1).toLowerCase()}</button>)}</div>{paymentMethod === "CREDIT" && <p className="mt-2 text-[11px] text-muted-foreground">This sale will be added to the credit ledger when payment is completed.</p>}</div>
          <Input name="amountPaid" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} type="number" min="0" step="0.01" placeholder={`Amount received · KES ${total.toFixed(2)}`} className="mt-3" required={paymentMethod !== "CREDIT"} />
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={splitPayment} onChange={(event) => setSplitPayment(event.target.checked)} /> Use two payment methods</label>
          {splitPayment && <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><select value={secondPaymentMethod} onChange={(event) => setSecondPaymentMethod(event.target.value as typeof paymentMethod)} className="h-9 rounded border border-border-strong bg-surface px-2 text-sm">{(["CASH", "MPESA", "CARD", "BANK_TRANSFER", "CREDIT"] as const).map((method) => <option key={method} value={method}>{method === "BANK_TRANSFER" ? "Bank transfer" : method === "MPESA" ? "M-Pesa" : method[0] + method.slice(1).toLowerCase()}</option>)}</select><Input value={secondPaymentAmount} onChange={(event) => setSecondPaymentAmount(event.target.value)} type="number" min="0" step="0.01" placeholder="Second payment amount" /></div>}
          {paymentMethod === "CASH" && receivedTotal.greaterThanOrEqualTo(total) && <div className="mt-2 flex justify-between rounded border border-success/20 bg-success-tint px-3 py-2 text-sm text-success"><span>Change</span><strong className="font-tabular">KES {change.toFixed(2)}</strong></div>}{error && <p className="mt-3 rounded border border-danger/20 bg-danger-tint px-3 py-2 text-[12px] text-danger">{error}</p>}{success && <p className="mt-3 rounded border border-success/20 bg-success-tint px-3 py-2 text-[12px] text-success">{success}</p>}<div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><Button type="button" variant="secondary" onClick={previewReceipt} disabled={cartLines.length === 0} className="h-11 text-sm font-semibold">View receipt</Button><Button type="submit" disabled={pending || cartLines.length === 0 || receivedTotal.lessThan(total) && ![paymentMethod, secondPaymentMethod].includes("CREDIT")} className="h-12 text-sm font-semibold">{pending ? "Completing sale..." : `Complete sale · KES ${total.toFixed(2)}`}<ArrowRight size={16} /></Button></div>
        </div>
      </aside>
    </form>
  );
}