-- CreateTable
CREATE TABLE "register_credentials" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "terminalCode" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "register_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "register_credentials_registerId_key" ON "register_credentials"("registerId");

-- CreateIndex
CREATE INDEX "register_credentials_registerId_idx" ON "register_credentials"("registerId");

-- AddForeignKey
ALTER TABLE "register_credentials" ADD CONSTRAINT "register_credentials_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
