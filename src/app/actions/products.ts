"use server";

import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import type { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { requireAuthContext, assertPermission, assertOwner, assertBranchAccess, AuthError } from "@/server/auth/context";
import { recordAudit } from "@/server/services/audit";
import { decreaseStock, increaseStock } from "@/server/services/inventory";
import {
  createCategorySchema,
  createBrandSchema,
  createProductSchema,
  updateProductSchema,
  addVariantSchema,
} from "@/lib/validation/products";
import type { ActionResult } from "./auth";

export async function createCategory(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "PRODUCTS_CREATE");

    const parsed = createCategorySchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    if (parsed.data.parentId && !(await ctx.db.category.findFirst({ where: { id: parsed.data.parentId } }))) {
      return { ok: false, error: "Parent category not found." };
    }

    const category = await ctx.db.category.create({
      data: {
        organizationId: ctx.organizationId,
        name: parsed.data.name,
        parentId: parsed.data.parentId || null,
      },
    });

    revalidatePath("/dashboard/products");
    return { ok: true, data: { id: category.id } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function createBrand(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "PRODUCTS_CREATE");

    const parsed = createBrandSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const brand = await ctx.db.brand.create({ data: { organizationId: ctx.organizationId, name: parsed.data.name } });

    revalidatePath("/dashboard/products");
    return { ok: true, data: { id: brand.id } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

/**
 * Creates a product with its first variant, and — if an opening warehouse
 * and quantity were given — records that opening stock as a proper
 * `OPENING_BALANCE` inventory movement (never a bare quantity write; see
 * DATABASE.md).
 */
function toTitleCase(value: string) {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeCellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return String(value).trim();
}

function getFirstMatchingCell(record: Record<string, unknown>, keys: string[]) {
  const lowerMap = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [String(key).trim().toLowerCase(), value]),
  );

  for (const key of keys) {
    const match = lowerMap[key.toLowerCase()];
    if (match !== undefined && match !== null && String(match).trim() !== "") {
      return normalizeCellValue(match);
    }
  }

  return "";
}

export async function importProductsFromSpreadsheet(raw: unknown): Promise<ActionResult<{ count: number }>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "PRODUCTS_CREATE");

    const data = raw instanceof FormData ? raw : null;
    if (!data) return { ok: false, error: "No spreadsheet file was provided." };

    const file = data.get("file");
    const mode = String(data.get("mode") ?? "upsert").toLowerCase();
    const importMode = ["create", "update", "upsert"].includes(mode) ? mode : "upsert";

    if (!(file instanceof File)) return { ok: false, error: "Upload a CSV or Excel file." };

    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const isXlsx = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");
    if (!isCsv && !isXlsx) return { ok: false, error: "Only CSV and Excel files are supported." };

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { ok: false, error: "The spreadsheet appears to be empty." };

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    if (rows.length === 0) return { ok: false, error: "No product rows were found in the spreadsheet." };

    const bulkImportTransactionOptions = { maxWait: 300000, timeout: 300000 };
    const skipped: string[] = [];
    const seenBarcodes = new Set<string>();
    let created = 0;
    let updated = 0;

    async function syncImportedWarehouseQuantity(
      tx: any,
      variantId: string,
      warehouseName: string,
      importedQuantity: string,
      reason: string,
      referenceType: string,
      referenceId: string,
    ) {
      const warehouse = await tx.warehouse.findFirst({
        where: { organizationId: ctx.organizationId, name: warehouseName, isActive: true },
      });
      if (!warehouse) return;

      const quantity = Number(importedQuantity);
      if (!Number.isFinite(quantity) || quantity < 0) return;

      const currentStock = await tx.inventoryItem.aggregate({
        _sum: { quantity: true },
        where: { warehouseId: warehouse.id, variantId },
      });
      const currentQuantity = new Decimal(currentStock._sum.quantity?.toString() ?? "0");
      const desiredQuantity = new Decimal(quantity);
      const delta = desiredQuantity.minus(currentQuantity);

      if (delta.isZero()) return;

      if (delta.greaterThan(0)) {
        await increaseStock(tx as unknown as Prisma.TransactionClient, {
          organizationId: ctx.organizationId,
          warehouseId: warehouse.id,
          variantId,
          quantity: delta,
          unitCost: 0,
          type: "OPENING_BALANCE",
          reason,
          createdById: ctx.userId,
          referenceType,
          referenceId,
        });
        return;
      }

      await decreaseStock(tx as unknown as Prisma.TransactionClient, {
        organizationId: ctx.organizationId,
        warehouseId: warehouse.id,
        variantId,
        quantity: delta.abs(),
        type: "ADJUSTMENT",
        reason,
        createdById: ctx.userId,
        referenceType,
        referenceId,
      });
    }

    async function findOrCreateCategory(name: string) {
      const clean = name.trim();
      if (!clean) return null;
      const existing = await ctx.db.category.findFirst({ where: { organizationId: ctx.organizationId, name: clean } });
      if (existing) return existing.id;
      const created = await ctx.db.category.create({ data: { organizationId: ctx.organizationId, name: toTitleCase(clean) } });
      return created.id;
    }

    async function findOrCreateBrand(name: string) {
      const clean = name.trim();
      if (!clean) return null;
      const existing = await ctx.db.brand.findFirst({ where: { organizationId: ctx.organizationId, name: clean } });
      if (existing) return existing.id;
      const created = await ctx.db.brand.create({ data: { organizationId: ctx.organizationId, name: toTitleCase(clean) } });
      return created.id;
    }

    async function findOrCreateSupplier(name: string) {
      const clean = name.trim();
      if (!clean) return null;
      const existing = await ctx.db.supplier.findFirst({ where: { organizationId: ctx.organizationId, name: clean } });
      if (existing) return existing.id;
      const created = await ctx.db.supplier.create({ data: { organizationId: ctx.organizationId, name: toTitleCase(clean), isActive: true } });
      return created.id;
    }

    for (const [index, row] of rows.entries()) {
      const name = getFirstMatchingCell(row, ["name", "product", "product_name", "product name"]);
      const sku = getFirstMatchingCell(row, ["sku", "product_sku", "item_sku", "code"]);
      const sellingPrice = getFirstMatchingCell(row, ["selling_price", "sellingprice", "price", "unit_price"]);
      const barcode = getFirstMatchingCell(row, ["barcode", "ean", "upc"]);
      const costPrice = getFirstMatchingCell(row, ["cost_price", "costprice", "cost"]);
      const wholesalePrice = getFirstMatchingCell(row, ["wholesale_price", "wholesaleprice"]);
      const categoryName = getFirstMatchingCell(row, ["category", "product_category", "category_name"]);
      const brandName = getFirstMatchingCell(row, ["brand", "brand_name"]);
      const supplierName = getFirstMatchingCell(row, ["supplier", "supplier_name", "primary_supplier"]);
      const unit = getFirstMatchingCell(row, ["unit", "uom", "measure"]) || "pc";
      const description = getFirstMatchingCell(row, ["description", "details", "notes"]);
      const minStock = getFirstMatchingCell(row, ["min_stock", "minimum_stock", "minimum"]);
      const reorderLevel = getFirstMatchingCell(row, ["reorder_level", "reorderlevel", "reorder"]);
      const openingWarehouseName = getFirstMatchingCell(row, ["opening_warehouse", "warehouse", "stock_warehouse"]);
      const openingQuantity = getFirstMatchingCell(row, ["opening_quantity", "stock_quantity", "quantity"]);

      if (barcode) {
        if (seenBarcodes.has(barcode)) {
          skipped.push(`Row ${index + 2}: duplicate barcode "${barcode}" found within this spreadsheet.`);
          continue;
        }
        seenBarcodes.add(barcode);
      }

      let existingVariant = null as null | { id: string; sku: string; name: string; productId: string; product: { id: string; name: string; description: string | null; categoryId: string | null; brandId: string | null; primarySupplierId: string | null; unit: string }; barcodes: { barcode: string }[] };

      if (sku) {
        existingVariant = await ctx.db.productVariant.findFirst({
          where: { sku },
          include: { product: true, barcodes: { select: { barcode: true } } },
        });
      }

      if (!existingVariant && barcode) {
        const existingBarcode = await ctx.db.productBarcode.findFirst({
          where: { barcode },
          include: { variant: { include: { product: true, barcodes: { select: { barcode: true } } } } },
        });
        existingVariant = existingBarcode ? existingBarcode.variant : null;
      }

      if (importMode === "create" && existingVariant) {
        skipped.push(`Row ${index + 2}: SKU "${sku || barcode}" already exists; skipped in create-only mode.`);
        continue;
      }

      if (importMode === "update" && !existingVariant) {
        skipped.push(`Row ${index + 2}: no existing product found for SKU or barcode "${sku || barcode || "unknown"}" in update-only mode.`);
        continue;
      }

      if (existingVariant) {
        const parsedSellingPrice = sellingPrice ? Number(sellingPrice) : undefined;
        if (sellingPrice && (Number.isNaN(parsedSellingPrice!) || Number(parsedSellingPrice) <= 0)) {
          skipped.push(`Row ${index + 2}: selling price must be a positive number.`);
          continue;
        }

        if (barcode) {
          const barcodeExists = await ctx.db.productBarcode.findFirst({ where: { barcode } });
          if (barcodeExists && barcodeExists.variantId !== existingVariant.id) {
            skipped.push(`Row ${index + 2}: barcode "${barcode}" is already used by another product.`);
            continue;
          }
        }

        const resolvedName = name || existingVariant.name || existingVariant.product.name;
        const resolvedSku = sku || existingVariant.sku;
        const resolvedSellingPrice = sellingPrice ? Number(sellingPrice) : Number(existingVariant.product ? 0 : 0);

        await ctx.db.$transaction(async (tx) => {
          const categoryId = categoryName ? await findOrCreateCategory(categoryName) : existingVariant!.product.categoryId;
          const brandId = brandName ? await findOrCreateBrand(brandName) : existingVariant!.product.brandId;
          const supplierId = supplierName ? await findOrCreateSupplier(supplierName) : existingVariant!.product.primarySupplierId;

          await tx.product.update({
            where: { id: existingVariant!.productId },
            data: {
              name: resolvedName,
              description: description !== "" ? (description || existingVariant!.product.description) : existingVariant!.product.description,
              categoryId: categoryId ?? null,
              brandId: brandId ?? null,
              primarySupplierId: supplierId ?? null,
              unit: unit || existingVariant!.product.unit,
            },
          });

          await tx.productVariant.update({
            where: { id: existingVariant!.id },
            data: {
              sku: resolvedSku,
              name: resolvedName,
              costPrice: costPrice ? Number(costPrice) : undefined,
              sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
              wholesalePrice: wholesalePrice ? Number(wholesalePrice) : undefined,
              minStock: minStock ? Number(minStock) : undefined,
              reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
            },
          });

          if (barcode && !existingVariant!.barcodes.some((item) => item.barcode === barcode)) {
            await tx.productBarcode.create({ data: { variantId: existingVariant!.id, barcode } });
          }

          if (openingWarehouseName && openingQuantity) {
            await syncImportedWarehouseQuantity(
              tx,
              existingVariant!.id,
              openingWarehouseName,
              openingQuantity,
              "Updated stock from spreadsheet import",
              "ProductImportUpdate",
              existingVariant!.productId,
            );
          }
        }, bulkImportTransactionOptions);

        updated += 1;
        continue;
      }

      if (!name || !sku || !sellingPrice) {
        skipped.push(`Row ${index + 2}: missing required name, SKU, or selling price for a new product.`);
        continue;
      }

      const parsedSellingPrice = Number(sellingPrice);
      if (Number.isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) {
        skipped.push(`Row ${index + 2}: selling price must be a positive number.`);
        continue;
      }

      if (sku) {
        const skuExists = await ctx.db.productVariant.findFirst({ where: { sku } });
        if (skuExists) {
          skipped.push(`Row ${index + 2}: SKU "${sku}" is already in use.`);
          continue;
        }
      }

      if (barcode) {
        const existingBarcode = await ctx.db.productBarcode.findFirst({ where: { barcode } });
        if (existingBarcode) {
          skipped.push(`Row ${index + 2}: barcode "${barcode}" is already used by another product.`);
          continue;
        }
      }

      const categoryId = categoryName ? await findOrCreateCategory(categoryName) : null;
      const brandId = brandName ? await findOrCreateBrand(brandName) : null;
      const supplierId = supplierName ? await findOrCreateSupplier(supplierName) : null;

      const productId = await ctx.db.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            organizationId: ctx.organizationId,
            name,
            description: description || null,
            categoryId: categoryId ?? null,
            brandId: brandId ?? null,
            primarySupplierId: supplierId ?? null,
            unit: unit || "pc",
            type: "STOCKED",
            trackExpiry: false,
          },
        });

        const variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku,
            name,
            costPrice: costPrice ? Number(costPrice) : 0,
            sellingPrice: parsedSellingPrice,
            wholesalePrice: wholesalePrice ? Number(wholesalePrice) : null,
            minStock: minStock ? Number(minStock) : 0,
            reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
          },
        });

        if (barcode) {
          await tx.productBarcode.create({ data: { variantId: variant.id, barcode } });
        }

        if (openingWarehouseName && openingQuantity) {
          const warehouse = await tx.warehouse.findFirst({ where: { organizationId: ctx.organizationId, name: openingWarehouseName, isActive: true } });
          if (warehouse) {
            const quantity = Number(openingQuantity);
            if (!Number.isNaN(quantity) && quantity > 0) {
              await increaseStock(tx as unknown as Prisma.TransactionClient, {
                organizationId: ctx.organizationId,
                warehouseId: warehouse.id,
                variantId: variant.id,
                quantity: openingQuantity,
                unitCost: Number(costPrice || "0"),
                type: "OPENING_BALANCE",
                reason: "Initial stock from spreadsheet import",
                createdById: ctx.userId,
                referenceType: "ProductImport",
                referenceId: product.id,
              });
            }
          }
        }

        return product.id;
      }, bulkImportTransactionOptions);

      await recordAudit({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: productId,
        metadata: { source: "spreadsheet_import", sku },
      });

      created += 1;
    }

    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/inventory");

    if (created === 0 && updated === 0) {
      return { ok: false, error: skipped[0] ?? "No valid rows were imported." };
    }

    return { ok: true, data: { count: created + updated }, warnings: skipped.length > 0 ? skipped.slice(0, 5) : undefined };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "Could not import products from the spreadsheet." };
  }
}

export async function createProduct(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "PRODUCTS_CREATE");

    const parsed = createProductSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }
    const input = parsed.data;

    const [category, brand, supplier, taxRate, warehouse] = await Promise.all([
      input.categoryId ? ctx.db.category.findFirst({ where: { id: input.categoryId } }) : null,
      input.brandId ? ctx.db.brand.findFirst({ where: { id: input.brandId } }) : null,
      input.primarySupplierId ? ctx.db.supplier.findFirst({ where: { id: input.primarySupplierId } }) : null,
      input.taxRateId ? ctx.db.taxRate.findFirst({ where: { id: input.taxRateId } }) : null,
      input.openingWarehouseId ? ctx.db.warehouse.findFirst({ where: { id: input.openingWarehouseId, isActive: true } }) : null,
    ]);
    if (input.categoryId && !category) return { ok: false, error: "Category not found." };
    if (input.brandId && !brand) return { ok: false, error: "Brand not found." };
    if (input.primarySupplierId && !supplier) return { ok: false, error: "Supplier not found." };
    if (input.taxRateId && !taxRate) return { ok: false, error: "Tax rate not found." };
    if (input.openingWarehouseId && !warehouse) return { ok: false, error: "Opening warehouse not found." };
    if (warehouse) assertBranchAccess(ctx, warehouse.branchId);

    if (input.barcode) {
      const existingBarcode = await ctx.db.productBarcode.findFirst({
        where: { barcode: input.barcode, variant: { product: { organizationId: ctx.organizationId } } },
      });
      if (existingBarcode) {
        return {
          ok: false,
          error: "This barcode is already assigned to another product.",
          fieldErrors: { barcode: ["Already in use"] },
        };
      }
    }

    const productId = await ctx.db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          description: input.description || null,
          categoryId: input.categoryId || null,
          brandId: input.brandId || null,
          primarySupplierId: input.primarySupplierId || null,
          unit: input.unit,
          type: input.type,
          trackExpiry: input.trackExpiry,
          imageUrl: input.imageUrl || null,
        },
      });

      const variant = await tx.productVariant.create({
        data: {
          productId: product.id,
          sku: input.sku,
          name: product.name,
          costPrice: input.costPrice,
          sellingPrice: input.sellingPrice,
          wholesalePrice: input.wholesalePrice || null,
          taxRateId: input.taxRateId || null,
          minStock: input.minStock,
          reorderLevel: input.reorderLevel,
        },
      });

      if (input.barcode) {
        await tx.productBarcode.create({
          data: { variantId: variant.id, barcode: input.barcode },
        });
      }

      if (input.openingWarehouseId && Number(input.openingQuantity) > 0) {
        await increaseStock(tx as unknown as Prisma.TransactionClient, {
          organizationId: ctx.organizationId,
          warehouseId: input.openingWarehouseId,
          variantId: variant.id,
          quantity: input.openingQuantity!,
          unitCost: input.costPrice,
          type: "OPENING_BALANCE",
          reason: "Opening balance at product creation",
          createdById: ctx.userId,
          referenceType: "ProductCreation",
          referenceId: product.id,
        });
      }

      return product.id;
    });

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: productId,
      metadata: { name: input.name, sku: input.sku },
    });

    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/inventory");
    return { ok: true, data: { id: productId } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function updateProduct(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "PRODUCTS_UPDATE");
    const parsed = updateProductSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }
    const input = parsed.data;
    const product = await ctx.db.product.findFirst({ where: { id: input.productId } });
    if (!product) return { ok: false, error: "Product not found." };
    const [category, brand, supplier] = await Promise.all([
      input.categoryId ? ctx.db.category.findFirst({ where: { id: input.categoryId } }) : null,
      input.brandId ? ctx.db.brand.findFirst({ where: { id: input.brandId } }) : null,
      input.primarySupplierId ? ctx.db.supplier.findFirst({ where: { id: input.primarySupplierId } }) : null,
    ]);
    if (input.categoryId && !category) return { ok: false, error: "Category not found." };
    if (input.brandId && !brand) return { ok: false, error: "Brand not found." };
    if (input.primarySupplierId && !supplier) return { ok: false, error: "Supplier not found." };

    await ctx.db.product.update({
      where: { id: input.productId },
      data: {
        name: input.name,
        description: input.description || null,
        categoryId: input.categoryId || null,
        brandId: input.brandId || null,
        primarySupplierId: input.primarySupplierId || null,
        unit: input.unit,
        type: input.type,
        trackExpiry: input.trackExpiry,
        imageUrl: input.imageUrl || null,
      },
    });

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: input.productId,
      metadata: { name: input.name },
    });
    revalidatePath("/dashboard/products");
    revalidatePath(`/dashboard/products/${input.productId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function deleteProduct(productId: string): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "PRODUCTS_DELETE");
    assertOwner(ctx);
    if (!productId) return { ok: false, error: "Product not found." };

    const product = await ctx.db.product.findFirst({ where: { id: productId } });
    if (!product) return { ok: false, error: "Product not found." };

    await ctx.db.product.update({ where: { id: productId }, data: { isActive: false } });
    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "PRODUCT_ARCHIVED",
      entityType: "Product",
      entityId: productId,
      metadata: { name: product.name },
    });
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/inventory");
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

/** Adds an additional variant (e.g. a different size/color) to an existing product. */
export async function addProductVariant(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    assertPermission(ctx, "PRODUCTS_CREATE");

    const parsed = addVariantSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }
    const input = parsed.data;

    const product = await ctx.db.product.findFirst({ where: { id: input.productId } });
    if (!product) {
      return { ok: false, error: "Product not found." };
    }
    if (input.taxRateId && !(await ctx.db.taxRate.findFirst({ where: { id: input.taxRateId } }))) return { ok: false, error: "Tax rate not found." };

    if (input.barcode) {
      const existingBarcode = await ctx.db.productBarcode.findFirst({
        where: { barcode: input.barcode, variant: { product: { organizationId: ctx.organizationId } } },
      });
      if (existingBarcode) {
        return {
          ok: false,
          error: "This barcode is already assigned to another product.",
          fieldErrors: { barcode: ["Already in use"] },
        };
      }
    }

    const attributes = Object.fromEntries(input.attributes.map((a) => [a.key, a.value]));

    const variant = await ctx.db.$transaction(async (tx) => {
      const v = await tx.productVariant.create({
        data: {
          productId: input.productId,
          sku: input.sku,
          name: input.name,
          attributes,
          costPrice: input.costPrice,
          sellingPrice: input.sellingPrice,
          wholesalePrice: input.wholesalePrice || null,
          taxRateId: input.taxRateId || null,
          minStock: input.minStock,
          reorderLevel: input.reorderLevel,
        },
      });

      if (input.barcode) {
        await tx.productBarcode.create({ data: { variantId: v.id, barcode: input.barcode } });
      }

      return v;
    });

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "PRODUCT_VARIANT_ADDED",
      entityType: "ProductVariant",
      entityId: variant.id,
      metadata: { productId: input.productId, sku: input.sku },
    });

    revalidatePath(`/dashboard/products/${input.productId}`);
    return { ok: true, data: { id: variant.id } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}
