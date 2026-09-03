"use client";

import { formatMoney } from "@/lib/receipts/receipt-utils";

type PreviewSettings = {
  paperSize: string;
  footerMessage: string | null;
  showBusinessLogo: boolean;
  backgroundLogoUrl: string | null;
  showBusinessAddress: boolean;
  showBusinessContact: boolean;
  showBranch: boolean;
  showReceiptNumber: boolean;
  showDate: boolean;
  showCashier: boolean;
  showCustomer: boolean;
  showSku: boolean;
  showTax: boolean;
  showDiscount: boolean;
  showPaymentReference: boolean;
};

export function ReceiptPreview({ settings, business }: { settings: PreviewSettings; business: { name: string; address: string | null; phone: string | null; email: string | null; logoUrl: string | null } }) {
  const sizeClass = settings.paperSize === "A4" ? "max-w-[430px]" : settings.paperSize === "58mm" ? "max-w-[260px]" : "max-w-[310px]";
  return <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Live preview</p><span className="text-[11px] text-muted-foreground">{settings.paperSize}</span></div><div className={`relative mx-auto overflow-hidden bg-white p-5 text-[11px] leading-[1.35] text-[#111] shadow-sm ${sizeClass}`}><div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07]">{settings.backgroundLogoUrl && <img src={settings.backgroundLogoUrl} alt="" className="max-h-[45%] max-w-[75%] object-contain" />}</div><div className="relative"><div className="text-center">{settings.showBusinessLogo && business.logoUrl && <img src={business.logoUrl} alt="" className="mx-auto mb-2 max-h-10 max-w-20 object-contain" />}<p className="text-base font-extrabold">{business.name}</p>{settings.showBusinessAddress && business.address && <p className="mt-1 text-[10px] text-[#666]">{business.address}</p>}{settings.showBusinessContact && <p className="text-[10px] text-[#666]">{[business.phone, business.email].filter(Boolean).join(" · ")}</p>}<p className="mt-3 text-[10px] font-bold tracking-[0.15em]">RECEIPT</p></div><div className="my-3 border-t border-dashed border-[#777]" /><div className="grid grid-cols-2 gap-1 text-[10px]"><span>{settings.showReceiptNumber ? "Receipt: R-00042" : ""}</span><span className="text-right">{settings.showDate ? "03 Sep 2026" : ""}</span>{settings.showBranch && <span>Branch: Main</span>}{settings.showCashier && <span className="text-right">Cashier: Alex</span>}{settings.showCustomer && <span>Customer: Jane Doe</span>}</div><table className="mt-3 w-full"><thead><tr className="border-b border-[#222] text-[10px]"><th className="py-1 text-left">Item</th><th className="py-1 text-right">Qty</th><th className="py-1 text-right">Amount</th></tr></thead><tbody><tr><td className="py-2">Milk {settings.showSku && <small className="block text-[9px] text-[#666]">SKU: MILK-01</small>}</td><td className="py-2 text-right">2</td><td className="py-2 text-right">{formatMoney(240)}</td></tr><tr><td className="py-2">Bread</td><td className="py-2 text-right">1</td><td className="py-2 text-right">{formatMoney(80)}</td></tr></tbody></table><div className="mt-2 border-t border-[#222] pt-2">{settings.showDiscount && <p className="flex justify-between"><span>Discount</span><span>{formatMoney(0)}</span></p>}{settings.showTax && <p className="flex justify-between"><span>Tax</span><span>{formatMoney(0)}</span></p>}<p className="mt-1 flex justify-between border-t border-[#222] pt-2 text-sm font-extrabold"><span>Total</span><span>{formatMoney(320)}</span></p><p className="flex justify-between"><span>Paid</span><span>{formatMoney(320)}</span></p></div><div className="mt-3 border-t border-dashed border-[#777] pt-2"><p className="font-bold">Cash</p>{settings.showPaymentReference && <p className="text-[9px] text-[#666]">Ref: CASH-00042</p>}</div><p className="mt-4 text-center text-[10px] text-[#555]">{settings.footerMessage || "Thank you for shopping with us!"}</p></div></div></div>;
}
