import { describe, expect, it } from "vitest";
import { getVariantLookupMatch, normalizeScanCode } from "@/lib/barcode";

describe("normalizeScanCode", () => {
  it("trims whitespace and normalizes SKU codes", () => {
    expect(normalizeScanCode("  coke500\n")).toBe("COKE500");
  });

  it("removes scanner delimiter noise from barcode input", () => {
    expect(normalizeScanCode("6161101234567\r")).toBe("6161101234567");
  });
});

describe("getVariantLookupMatch", () => {
  it("matches a variant by barcode or SKU in a tenant-safe way", () => {
    const variants = [
      {
        id: "v_1",
        sku: "COKE500",
        name: "Coca Cola 500ml",
        barcodes: [{ barcode: "6161101234567" }],
      },
      {
        id: "v_2",
        sku: "TEA200",
        name: "Tea Bags 200g",
        barcodes: [{ barcode: "1234567890123" }],
      },
    ];

    expect(getVariantLookupMatch(variants, "6161101234567")).toMatchObject({ id: "v_1" });
    expect(getVariantLookupMatch(variants, "coke500")).toMatchObject({ id: "v_1" });
    expect(getVariantLookupMatch(variants, "unknown-code")).toBeNull();
  });
});
