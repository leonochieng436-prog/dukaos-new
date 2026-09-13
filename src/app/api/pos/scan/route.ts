import Decimal from "decimal.js";
import { NextResponse } from "next/server";
import { requireAuthContext } from "@/server/auth/context";
import { normalizeScanCode } from "@/lib/barcode";

export async function POST(request: Request) {
  try {
    const ctx = await requireAuthContext();
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = normalizeScanCode(body.code ?? "");

    if (!code) {
      return NextResponse.json(
        { success: false, error: "A barcode or SKU is required." },
        { status: 400 }
      );
    }

    const variant = await ctx.db.productVariant.findFirst({
      where: {
        organizationId: ctx.organizationId,
        isActive: true,
        product: {
          isActive: true,
          organizationId: ctx.organizationId,
        },
        OR: [
          { sku: { equals: code, mode: "insensitive" } },
          { barcodes: { some: { barcode: { equals: code, mode: "insensitive" } } } },
        ],
      },
      include: {
        product: { include: { category: true } },
        barcodes: { select: { barcode: true } },
        inventoryItems: { select: { warehouseId: true, quantity: true } },
      },
    });

    if (!variant) {
      return NextResponse.json(
        { success: false, error: `No product found for barcode or SKU: ${code}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product: {
        id: variant.id,
        name: `${variant.product.name}${variant.name !== variant.product.name ? ` - ${variant.name}` : ""}`,
        sku: variant.sku,
        barcode: variant.barcodes[0]?.barcode ?? null,
        price: variant.sellingPrice.toString(),
        stock: variant.inventoryItems.reduce((sum, item) => sum.plus(new Decimal(item.quantity.toString())), new Decimal(0)).toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to scan product.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
