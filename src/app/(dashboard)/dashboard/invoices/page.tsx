import Link from "next/link";
import { requireAuthContext } from "@/server/auth/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "./invoice-form";
import Decimal from "decimal.js";

function money(value: Decimal | string | number) { return new Decimal(value).toFixed(2); }

export default async function InvoicesPage() {
  const ctx = await requireAuthContext();
  const [organization, customers, products, taxRates, invoices] = await Promise.all([
    ctx.db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } }),
    ctx.db.customer.findMany({ where: { isWalkIn: false }, orderBy: { name: "asc" } }),
    ctx.db.product.findMany({ where: { isActive: true }, include: { variants: { where: { isActive: true }, orderBy: { sellingPrice: "asc" }, take: 1 } }, orderBy: { name: "asc" } }),
    ctx.db.taxRate.findMany({ where: { isActive: true }, orderBy: { rate: "asc" } }),
    ctx.db.invoice.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const totals = invoices.reduce((sum, invoice) => ({ invoiced: sum.invoiced.plus(invoice.total.toString()), paid: sum.paid.plus(invoice.amountPaid.toString()), due: sum.due.plus(invoice.amountDue.toString()), overdue: sum.overdue.plus(invoice.status === "OVERDUE" ? invoice.amountDue.toString() : 0) }), { invoiced: new Decimal(0), paid: new Decimal(0), due: new Decimal(0), overdue: new Decimal(0) });
  const statCards: { label: string; value: Decimal }[] = [
    { label: "Total invoiced", value: totals.invoiced },
    { label: "Paid", value: totals.paid },
    { label: "Outstanding", value: totals.due },
    { label: "Overdue", value: totals.overdue },
  ];
  const today = new Date();
  const issueDate = today.toISOString().slice(0, 10);
  const dueDate = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10);
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-lg font-semibold">Invoicing</h1><p className="text-sm text-muted-foreground">Create, send, and track customer invoices.</p></div><Link href="#create-invoice"><Button>Create invoice</Button></Link></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{statCards.map(({ label, value }) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-tabular text-xl font-semibold">{organization.currency} {money(value)}</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="pb-3">Invoice</th><th className="pb-3">Customer</th><th className="pb-3">Due</th><th className="pb-3">Amount</th><th className="pb-3">Status</th></tr></thead><tbody className="divide-y divide-border">{invoices.map((invoice) => <tr key={invoice.id}><td className="py-3"><Link href={`/dashboard/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">{invoice.invoiceNumber}</Link></td><td className="py-3">{invoice.customer.name}</td><td className="py-3 text-muted-foreground">{invoice.dueDate.toLocaleDateString()}</td><td className="py-3 font-tabular">{invoice.currency} {money(invoice.total)}</td><td className="py-3"><span className="rounded bg-surface-muted px-2 py-1 text-xs font-medium">{invoice.status}</span></td></tr>)}{invoices.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No invoices yet.</td></tr>}</tbody></table></div></CardContent></Card><div id="create-invoice"><h2 className="mb-3 text-base font-semibold">Create invoice</h2><InvoiceForm customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))} products={products.map((product) => ({ id: product.id, name: product.name, price: product.variants[0]?.sellingPrice.toString() ?? "0" }))} taxRates={taxRates.map((tax) => ({ id: tax.id, name: tax.name, rate: tax.rate.toString() }))} currency={organization.currency} issueDate={issueDate} dueDate={dueDate} /></div></div>;
}