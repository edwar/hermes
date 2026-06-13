-- Migration: add_sale_localid_unique
-- Created: 2026-06-13
-- Adds unique constraint on (localId, companyId) to prevent duplicate sale creation
-- when the client retries due to timeout or the sync replay replays a queued mutation.

-- First clean up any remaining orphans where localId is an empty string (treat as NULL)
UPDATE "Sale" SET "localId" = NULL WHERE "localId" = '';

CREATE UNIQUE INDEX IF NOT EXISTS "Sale_localId_companyId_key" ON "Sale"("localId", "companyId");
