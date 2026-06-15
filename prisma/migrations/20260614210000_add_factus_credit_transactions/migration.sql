-- Migration: add_factus_credit_transactions
-- Created: 2026-06-14
-- Tracks every purchase and consumption of Factus credits per company.

CREATE TABLE IF NOT EXISTS "FactusCreditTransaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "saleId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FactusCreditTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FactusCreditTransaction_companyId_createdAt_idx"
    ON "FactusCreditTransaction"("companyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FactusCreditTransaction_createdAt_idx"
    ON "FactusCreditTransaction"("createdAt" DESC);

ALTER TABLE "FactusCreditTransaction" ADD CONSTRAINT "FactusCreditTransaction_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FactusCreditTransaction" ADD CONSTRAINT "FactusCreditTransaction_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
