import Decimal from "decimal.js";

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
