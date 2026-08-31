import { describe, expect, it } from "vitest";
import { allocatePaymentToSales, calculateCustomerCreditBalance, calculateSaleOutstanding } from "./credit";

describe("credit calculations", () => {
  it("calculates the outstanding amount for a single credit sale", () => {
    expect(calculateSaleOutstanding("1200.00", "350.50")).toBe("849.50");
  });

  it("calculates the overall customer balance after partial payments", () => {
    const balance = calculateCustomerCreditBalance({
      creditSales: [
        { total: "1000.00", amountPaid: "250.00" },
        { total: "480.00", amountPaid: "0.00" },
      ],
      customerPayments: [{ amount: "300.00" }, { amount: "80.00" }],
    });

    expect(balance).toBe("850.00");
  });

  it("allocates a payment across the oldest outstanding credit sales", () => {
    const allocations = allocatePaymentToSales({
      sales: [
        { id: "sale-1", total: "1000.00", amountPaid: "250.00" },
        { id: "sale-2", total: "480.00", amountPaid: "0.00" },
      ],
      paymentAmount: "300.00",
    });

    expect(allocations).toEqual([
      { saleId: "sale-1", amount: "300.00" },
    ]);
  });

  it("rejects a payment that exceeds the total outstanding receivables", () => {
    expect(() =>
      allocatePaymentToSales({
        sales: [
          { id: "sale-1", total: "1000.00", amountPaid: "900.00" },
        ],
        paymentAmount: "150.00",
      }),
    ).toThrow("Payment exceeds the total outstanding credit balance.");
  });
});
