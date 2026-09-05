ALTER TABLE "product_variants" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "batches" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "inventory_items" ADD COLUMN "organizationId" TEXT;

UPDATE "product_variants" AS v
SET "organizationId" = p."organizationId"
FROM "products" AS p
WHERE v."productId" = p."id";

UPDATE "batches" AS b
SET "organizationId" = w."organizationId"
FROM "warehouses" AS w
WHERE b."warehouseId" = w."id";

UPDATE "inventory_items" AS i
SET "organizationId" = w."organizationId"
FROM "warehouses" AS w
WHERE i."warehouseId" = w."id";

ALTER TABLE "product_variants" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "batches" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "inventory_items" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX "product_variants_organizationId_idx" ON "product_variants"("organizationId");
CREATE INDEX "batches_organizationId_idx" ON "batches"("organizationId");
CREATE INDEX "inventory_items_organizationId_idx" ON "inventory_items"("organizationId");

ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batches" ADD CONSTRAINT "batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
