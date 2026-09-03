ALTER TABLE "receipt_settings"
  ADD COLUMN "backgroundLogoUrl" TEXT,
  ADD COLUMN "showBusinessAddress" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showBusinessContact" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showBranch" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showReceiptNumber" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showDate" BOOLEAN NOT NULL DEFAULT true;
