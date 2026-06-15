-- Migration: add_owner_role
-- Created: 2026-06-14
-- Adds OWNER role to the UserRole enum.
-- OWNER is the company owner (invited by GOD), sits between GOD and ADMIN in hierarchy.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER';
