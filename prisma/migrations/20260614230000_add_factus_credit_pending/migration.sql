-- Migration: add_factus_credit_pending
-- Credits purchased go to pending until GOD activates them.

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "factusCreditPending" INTEGER NOT NULL DEFAULT 0;
