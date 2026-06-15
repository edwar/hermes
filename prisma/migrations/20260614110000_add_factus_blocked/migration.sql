-- Migration: add_factus_blocked
-- Created: 2026-06-14
-- Adds factusBlocked flag to Company so GOD can block FE creation for non-paying clients.

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "factusBlocked" BOOLEAN NOT NULL DEFAULT false;
