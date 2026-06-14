-- Migration: add_processed_sync_request_table
-- Created: 2026-06-13

-- Tabla para deduplicación e idempotencia del replay de la cola offline-first.
-- Se crea aquí porque la migración 999_add_system_config_tables no la incluyó
-- a pesar de estar en schema.prisma, lo que causaba que findUnique/create
-- lanzaran errores y el sync/batch fallara silenciosamente.

CREATE TABLE IF NOT EXISTS "ProcessedSyncRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "responseJson" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedSyncRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProcessedSyncRequest_clientId_method_url_key" ON "ProcessedSyncRequest"("clientId", "method", "url");
CREATE INDEX IF NOT EXISTS "ProcessedSyncRequest_companyId_idx" ON "ProcessedSyncRequest"("companyId");
CREATE INDEX IF NOT EXISTS "ProcessedSyncRequest_createdAt_idx" ON "ProcessedSyncRequest"("createdAt");
