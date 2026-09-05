import Decimal from "decimal.js";

export type InvoiceLineInput = {
  description: string;
  quantity: string;
  unitPrice: string;
  discount?: string;
  taxRate?: string;
  productId?: string;
};

export function calculateInvoice(lines: InvoiceLineInput[]) {
  const items = lines.map((line) => {
    const quantity = new Decimal(line.quantity || 0);
    const unitPrice = new Decimal(line.unitPrice || 0);
    const discount = new Decimal(line.discount || 0);
    const taxRate = new Decimal(line.taxRate || 0);
    const net = Decimal.max(quantity.times(unitPrice).minus(discount), 0);
    const taxAmount = net.times(taxRate).dividedBy(100);
    return {
      description: line.description.trim(),
      quantity: quantity.toFixed(3),
      unitPrice: unitPrice.toFixed(2),
      discount: discount.toFixed(2),
      taxRate: taxRate.toFixed(3),
      taxAmount: taxAmount.toFixed(2),
      total: net.plus(taxAmount).toFixed(2),
      productId: line.productId || null,
      net,
      tax: taxAmount,
    };
  });

  const subtotal = items.reduce((sum, item) => sum.plus(item.net), new Decimal(0));
  const discountTotal = items.reduce((sum, item) => sum.plus(item.discount), new Decimal(0));
  const taxTotal = items.reduce((sum, item) => sum.plus(item.tax), new Decimal(0));
  const total = subtotal.plus(taxTotal);

  return {
    items,
    subtotal: subtotal.toFixed(2),
    discountTotal: discountTotal.toFixed(2),
    taxTotal: taxTotal.toFixed(2),
    total: total.toFixed(2),
  };
}
