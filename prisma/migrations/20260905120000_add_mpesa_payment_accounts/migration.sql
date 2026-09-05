CREATE TYPE "MpesaEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');
CREATE TYPE "MpesaAccountType" AS ENUM ('TILL', 'PAYBILL');
CREATE TYPE "MpesaConnectionStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING', 'ACTIVE', 'FAILED', 'DISCONNECTED');
CREATE TYPE "MpesaIntentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "payment_accounts" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'MPESA',
  "accountType" "MpesaAccountType" NOT NULL,
  "displayName" TEXT NOT NULL,
  "shortcode" TEXT NOT NULL,
  "consumerKeyEncrypted" TEXT NOT NULL,
  "consumerSecretEncrypted" TEXT NOT NULL,
  "passkeyEncrypted" TEXT NOT NULL,
  "environment" "MpesaEnvironment" NOT NULL DEFAULT 'SANDBOX',
  "status" "MpesaConnectionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "lastTestedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mpesa_payment_intents" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "paymentAccountId" TEXT NOT NULL,
  "saleId" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "accountReference" TEXT NOT NULL,
  "checkoutRequestId" TEXT,
  "merchantRequestId" TEXT,
  "mpesaReceiptNumber" TEXT,
  "status" "MpesaIntentStatus" NOT NULL DEFAULT 'PENDING',
  "resultCode" INTEGER,
  "resultDescription" TEXT,
  "metadata" JSONB,
  "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mpesa_payment_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mpesa_payment_intents_checkoutRequestId_key" ON "mpesa_payment_intents"("checkoutRequestId");
CREATE INDEX "payment_accounts_organizationId_branchId_idx" ON "payment_accounts"("organizationId", "branchId");
CREATE INDEX "payment_accounts_organizationId_status_idx" ON "payment_accounts"("organizationId", "status");
CREATE INDEX "mpesa_payment_intents_organizationId_status_idx" ON "mpesa_payment_intents"("organizationId", "status");
CREATE INDEX "mpesa_payment_intents_organizationId_initiatedAt_idx" ON "mpesa_payment_intents"("organizationId", "initiatedAt");
CREATE INDEX "mpesa_payment_intents_accountReference_idx" ON "mpesa_payment_intents"("accountReference");

ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mpesa_payment_intents" ADD CONSTRAINT "mpesa_payment_intents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mpesa_payment_intents" ADD CONSTRAINT "mpesa_payment_intents_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mpesa_payment_intents" ADD CONSTRAINT "mpesa_payment_intents_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "payment_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mpesa_payment_intents" ADD CONSTRAINT "mpesa_payment_intents_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
