-- CreateEnum
CREATE TYPE "PurchaseReceivingStatus" AS ENUM ('RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchasePaymentStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID');

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "supplierInvoiceNumber" TEXT,
    "receivingStatus" "PurchaseReceivingStatus" NOT NULL DEFAULT 'RECEIVED',
    "paymentStatus" "PurchasePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discountTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "paidOn" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "batchId" TEXT,
    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "purchase_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchases_organizationId_purchaseNumber_key" ON "purchases"("organizationId", "purchaseNumber");
CREATE INDEX "purchases_organizationId_paymentStatus_idx" ON "purchases"("organizationId", "paymentStatus");
CREATE INDEX "purchases_organizationId_purchaseDate_idx" ON "purchases"("organizationId", "purchaseDate");
CREATE INDEX "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");
CREATE INDEX "purchase_payments_organizationId_purchaseId_idx" ON "purchase_payments"("organizationId", "purchaseId");

ALTER TABLE "purchases" ADD CONSTRAINT "purchases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON UPDATE CASCADE;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON UPDATE CASCADE;
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
