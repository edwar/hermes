-- Migration: permission_rules
-- Reglas de acceso por módulo en capas (usuario → empresa → global). Sin reglas guardadas,
-- el acceso sigue siendo el de NAV_ACCESS (lib/navigation.ts): esta migración no cambia
-- ningún permiso por sí sola.

DO $$ BEGIN
  CREATE TYPE "PermissionScope" AS ENUM ('GLOBAL', 'COMPANY', 'USER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PermissionRule" (
  "id" TEXT NOT NULL,
  "scope" "PermissionScope" NOT NULL,
  "subject" TEXT NOT NULL,
  "role" "UserRole",
  "companyId" TEXT,
  "userId" TEXT,
  "module" TEXT NOT NULL,
  "allowed" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PermissionRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PermissionRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PermissionRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PermissionRule_subject_module_key" ON "PermissionRule"("subject", "module");
CREATE INDEX IF NOT EXISTS "PermissionRule_scope_role_idx" ON "PermissionRule"("scope", "role");
CREATE INDEX IF NOT EXISTS "PermissionRule_companyId_idx" ON "PermissionRule"("companyId");
CREATE INDEX IF NOT EXISTS "PermissionRule_userId_idx" ON "PermissionRule"("userId");
