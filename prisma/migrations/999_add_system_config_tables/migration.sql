-- Migration: add_system_config_tables
-- Created: 2026-05-31

-- SystemConfig table for flexible key-value settings
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemConfig_category_key_companyId_key" ON "SystemConfig"("category", "key", "companyId");

-- PaymentMethodConfig table for Factus payment method mappings
CREATE TABLE "PaymentMethodConfig" (
    "id" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "factusPaymentForm" INTEGER NOT NULL,
    "factusPaymentMethodCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentMethodConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentMethodConfig_internalCode_companyId_key" ON "PaymentMethodConfig"("internalCode", "companyId");

-- Add foreign key constraints
ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentMethodConfig" ADD CONSTRAINT "PaymentMethodConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;