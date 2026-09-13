export type BarcodeLookupVariant = {
  id: string;
  sku: string;
  name?: string;
  barcodes?: Array<{ barcode: string }>;
};

export function normalizeScanCode(raw: string): string {
  return String(raw ?? "")
    .replace(/[\r\n\t]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

export function getVariantLookupMatch<T extends BarcodeLookupVariant>(variants: T[], rawCode: string): T | null {
  const code = normalizeScanCode(rawCode);
  if (!code) return null;

  return (
    variants.find((variant) => {
      const skuMatches = normalizeScanCode(variant.sku) === code;
      const barcodeMatches = (variant.barcodes ?? []).some(
        (entry) => normalizeScanCode(entry.barcode) === code,
      );
      return skuMatches || barcodeMatches;
    }) ?? null
  );
}
