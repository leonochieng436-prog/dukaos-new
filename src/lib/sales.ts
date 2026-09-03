import Decimal from "decimal.js";

export type SalePaymentMethod = "CASH" | "MPESA" | "CARD" | "BANK_TRANSFER" | "CREDIT" | "OTHER";

export type SalePayment = {
  method: SalePaymentMethod;
  amount: string;
};

export function validateSalePayments({
  total,
  paymentMethod,
  payments,
}: {
  total: string;
  paymentMethod: SalePaymentMethod;
  payments: SalePayment[];
}) {
  try {
    const totalValue = new Decimal(total);
    if (!totalValue.isFinite() || totalValue.isNegative()) return { ok: false as const, error: "Sale total is invalid." };
    if (payments.length === 0 || payments.some((payment) => !new Decimal(payment.amount).isFinite() || new Decimal(payment.amount).isNegative())) {
      return { ok: false as const, error: "Payment amounts must be valid and cannot be negative." };
    }

    const creditPayments = payments.filter((payment) => payment.method === "CREDIT");
    if (creditPayments.length > 1) return { ok: false as const, error: "A sale can have only one credit payment." };
    if (creditPayments.length > 0 && paymentMethod !== "CREDIT") return { ok: false as const, error: "The payment method does not match the credit payment." };

    const nonCreditTotal = payments
      .filter((payment) => payment.method !== "CREDIT")
      .reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
    const creditAmount = creditPayments.length === 1 ? new Decimal(creditPayments[0].amount) : new Decimal(0);
    const tenderedTotal = nonCreditTotal.plus(creditAmount);

    if (paymentMethod === "CREDIT" && creditPayments.length !== 1) return { ok: false as const, error: "Credit sales require a credit payment." };
    if (creditPayments.length === 1 && !creditAmount.equals(Decimal.max(totalValue.minus(nonCreditTotal), 0))) {
      return { ok: false as const, error: "Credit payment must equal the remaining sale balance." };
    }
    if (creditPayments.length === 0 && nonCreditTotal.lessThan(totalValue)) return { ok: false as const, error: "Payment is less than the sale total." };
    if (creditPayments.length > 0 && tenderedTotal.lessThan(totalValue)) return { ok: false as const, error: "Payments do not cover the sale total." };

    return { ok: true as const, nonCreditTotal, creditAmount };
  } catch {
    return { ok: false as const, error: "Payment amounts must be valid and cannot be negative." };
  }
}

export function summarizeSaleCorrection({
  total,
  amountPaid,
}: {
  total: string;
  amountPaid: string;
}) {
  const totalValue = new Decimal(total || "0");
  const amountPaidValue = new Decimal(amountPaid || "0");
  const changeGiven = Decimal.max(amountPaidValue.minus(totalValue), new Decimal(0));

  return {
    total: totalValue.toFixed(2),
    amountPaid: amountPaidValue.toFixed(2),
    changeGiven: changeGiven.toFixed(2),
    isIncomplete: amountPaidValue.lessThan(totalValue),
  };
}

export function buildSaleCorrectionImpact({
  originalTotal,
  originalAmountPaid,
  correctedTotal,
  correctedAmountPaid,
}: {
  originalTotal: string;
  originalAmountPaid: string;
  correctedTotal: string;
  correctedAmountPaid: string;
}) {
  const originalTotalValue = new Decimal(originalTotal || "0");
  const originalPaidValue = new Decimal(originalAmountPaid || "0");
  const correctedTotalValue = new Decimal(correctedTotal || "0");
  const correctedPaidValue = new Decimal(correctedAmountPaid || "0");

  return {
    original: summarizeSaleCorrection({ total: originalTotalValue.toFixed(2), amountPaid: originalPaidValue.toFixed(2) }),
    corrected: summarizeSaleCorrection({ total: correctedTotalValue.toFixed(2), amountPaid: correctedPaidValue.toFixed(2) }),
    totalDelta: correctedTotalValue.minus(originalTotalValue).toFixed(2),
    amountPaidDelta: correctedPaidValue.minus(originalPaidValue).toFixed(2),
  };
}

export function buildReceiptPreview({
  customerName,
  paymentMethod,
  amountPaid,
  total,
  items,
}: {
  customerName: string;
  paymentMethod: string;
  amountPaid: string;
  total: string;
  items: Array<{ name: string; quantity: number; unitPrice: string; total: string }>;
}) {
  const totalValue = new Decimal(total || "0");
  const paidValue = new Decimal(amountPaid || "0");
  const changeGiven = Decimal.max(paidValue.minus(totalValue), new Decimal(0));

  return {
    customerName: customerName || "Walk-in customer",
    paymentMethod,
    amountPaid: paidValue.toFixed(2),
    total: totalValue.toFixed(2),
    changeGiven: changeGiven.toFixed(2),
    items,
  };
}

export function buildSaleVersionTimeline({
  status,
  hasReturn,
  correctionCount,
}: {
  status: string;
  hasReturn: boolean;
  correctionCount: number;
}) {
  const steps = [{ version: 1, label: "Original receipt", status: "original" }];

  if (status === "VOIDED") {
    steps.push({ version: 2, label: "Void recorded", status: "warning" });
    return steps;
  }

  if (hasReturn || status === "RETURNED") {
    steps.push({ version: 2, label: "Refund recorded", status: "danger" });
    return steps;
  }

  if (correctionCount > 0) {
    steps.push({ version: 2, label: "Corrected sale", status: "warning" });
  }

  return steps;
}
