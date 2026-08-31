import { describe, expect, it } from "vitest";
import { summarizeSaleCorrection, buildSaleVersionTimeline, buildReceiptPreview, buildSaleCorrectionImpact } from "./sales";

describe("sales correction summary", () => {
  it("calculates the corrected total, collected amount and change", () => {
    expect(summarizeSaleCorrection({ total: "1500.00", amountPaid: "1700.00" })).toEqual({
      total: "1500.00",
      amountPaid: "1700.00",
      changeGiven: "200.00",
      isIncomplete: false,
    });
  });

  it("flags a sale that is still underpaid", () => {
    expect(summarizeSaleCorrection({ total: "1500.00", amountPaid: "1200.00" })).toEqual({
      total: "1500.00",
      amountPaid: "1200.00",
      changeGiven: "0.00",
      isIncomplete: true,
    });
  });

  it("builds a version timeline for a completed and adjusted sale", () => {
    expect(buildSaleVersionTimeline({ status: "VOIDED", hasReturn: false, correctionCount: 1 })).toEqual([
      { version: 1, label: "Original receipt", status: "original" },
      { version: 2, label: "Void recorded", status: "warning" },
    ]);
  });

  it("tracks the delta created by a sale correction", () => {
    expect(buildSaleCorrectionImpact({
      originalTotal: "1500.00",
      originalAmountPaid: "1500.00",
      correctedTotal: "1250.00",
      correctedAmountPaid: "1200.00",
    })).toEqual({
      original: {
        total: "1500.00",
        amountPaid: "1500.00",
        changeGiven: "0.00",
        isIncomplete: false,
      },
      corrected: {
        total: "1250.00",
        amountPaid: "1200.00",
        changeGiven: "0.00",
        isIncomplete: true,
      },
      totalDelta: "-250.00",
      amountPaidDelta: "-300.00",
    });
  });

  it("builds a printable receipt preview from the current sale", () => {
    expect(buildReceiptPreview({
      customerName: "Jane Doe",
      paymentMethod: "CASH",
      amountPaid: "650.00",
      total: "500.00",
      items: [{ name: "Milk", quantity: 2, unitPrice: "200.00", total: "400.00" }],
    })).toEqual({
      customerName: "Jane Doe",
      paymentMethod: "CASH",
      amountPaid: "650.00",
      total: "500.00",
      changeGiven: "150.00",
      items: [{ name: "Milk", quantity: 2, unitPrice: "200.00", total: "400.00" }],
    });
  });
});
