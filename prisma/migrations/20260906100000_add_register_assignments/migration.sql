CREATE TABLE "register_assignments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "register_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "register_assignments_userId_registerId_key" ON "register_assignments"("userId", "registerId");
CREATE INDEX "register_assignments_registerId_idx" ON "register_assignments"("registerId");

ALTER TABLE "register_assignments" ADD CONSTRAINT "register_assignments_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "register_assignments" ADD CONSTRAINT "register_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "register_assignments" ADD CONSTRAINT "register_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
