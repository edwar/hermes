-- Migration: factus_per_company_credentials
-- Credenciales de Factus por empresa (una cuenta por NIT) y control de
-- reintentos/idempotencia para la emisión de facturas electrónicas.

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "factusClientId" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "factusClientSecretEnc" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "factusUsername" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "factusPasswordEnc" TEXT;

ALTER TABLE "ElectronicInvoice" ADD COLUMN IF NOT EXISTS "referenceCode" TEXT;
ALTER TABLE "ElectronicInvoice" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ElectronicInvoice" ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3);
ALTER TABLE "ElectronicInvoice" ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ElectronicInvoice_status_nextRetryAt_idx" ON "ElectronicInvoice"("status", "nextRetryAt");
CREATE INDEX IF NOT EXISTS "ElectronicInvoice_companyId_status_idx" ON "ElectronicInvoice"("companyId", "status");
