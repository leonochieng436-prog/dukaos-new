import Decimal from "decimal.js";

export function calculateSaleOutstanding(total: string, amountPaid: string) {
  return new Decimal(total).minus(new Decimal(amountPaid)).toFixed(2);
}

export function allocatePaymentToSales({
  sales,
  paymentAmount,
}: {
  sales: Array<{ id: string; total: string; amountPaid: string }>;
  paymentAmount: string;
}) {
  const payment = new Decimal(paymentAmount);
  const totalOutstanding = sales.reduce(
    (sum, sale) => sum.plus(new Decimal(sale.total).minus(new Decimal(sale.amountPaid))),
    new Decimal(0),
  );

  if (payment.lte(0)) return [];
  if (payment.gt(totalOutstanding)) {
    throw new Error("Payment exceeds the total outstanding credit balance.");
  }

  let remaining = payment;
  const allocations: Array<{ saleId: string; amount: string }> = [];

  for (const sale of sales) {
    const outstanding = new Decimal(sale.total).minus(new Decimal(sale.amountPaid));
    if (outstanding.lte(0)) continue;

    const applied = Decimal.min(remaining, outstanding);
    if (applied.gt(0)) {
      allocations.push({ saleId: sale.id, amount: applied.toFixed(2) });
      remaining = remaining.minus(applied);
    }

    if (remaining.lte(0)) break;
  }

  return allocations;
}

export function calculateCustomerCreditBalance({
  creditSales,
  customerPayments,
}: {
  creditSales: Array<{ total: string; amountPaid: string }>;
  customerPayments: Array<{ amount: string }>;
}) {
  const salesTotal = creditSales.reduce(
    (sum, sale) => sum.plus(new Decimal(sale.total).minus(new Decimal(sale.amountPaid))),
    new Decimal(0),
  );
  const paymentsTotal = customerPayments.reduce(
    (sum, payment) => sum.plus(new Decimal(payment.amount)),
    new Decimal(0),
  );

  return salesTotal.minus(paymentsTotal).toFixed(2);
}
