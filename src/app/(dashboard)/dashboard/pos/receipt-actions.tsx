"use client";

import { Printer, Download } from "lucide-react";

export function ReceiptActions({ saleId }: { saleId: string }) {
  return <div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(15,123,108,0.16)]"><Printer size={15} /> Print receipt</button><a href={`/api/receipts/${saleId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm font-semibold transition-all duration-150 hover:-translate-y-0.5 hover:bg-surface-muted"><Download size={15} /> Open receipt</a></div>;
}
