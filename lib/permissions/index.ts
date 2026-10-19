// Carga las reglas de la base de datos y resuelve el acceso con lib/permissions/resolve.ts.
// En la fase 1 todavía no lo usa nadie: el menú, la guía y la API siguen con NAV_ACCESS.

import { prisma } from "@/lib/prisma"
import type { Role } from "@/lib/navigation"
import {
  allowedModules,
  resolveAccess,
  type PermissionRuleData,
  type PermissionSubject,
} from "@/lib/permissions/resolve"

export * from "@/lib/permissions/resolve"

// Caché corta por persona: cada pantalla y cada llamada a la API consulta los permisos. Vive en globalThis
// para que el API que guarda una regla y las pantallas del mismo proceso compartan (y limpien) la misma.
// En producción cada instancia serverless tiene la suya: un cambio se ve en todas en, como mucho, CACHE_TTL_MS.
export const CACHE_TTL_MS = 15_000
const globalCache = globalThis as unknown as { __permissionRulesCache?: Map<string, { at: number; rules: PermissionRuleData[] }> }
const cache = (globalCache.__permissionRulesCache ??= new Map())

export function clearPermissionCache() {
  cache.clear()
}

/** Solo las reglas que pueden aplicarle a esta persona: las de su usuario, su empresa y su rol. */
export async function loadRulesFor(subject: PermissionSubject): Promise<PermissionRuleData[]> {
  const key = `${subject.userId}:${subject.companyId ?? ""}:${subject.role ?? ""}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rules

  const role = subject.role as Role | undefined
  const rows = await prisma.permissionRule.findMany({
    where: {
      OR: [
        ...(role ? [{ scope: "GLOBAL" as const, role }] : []),
        ...(role && subject.companyId ? [{ scope: "COMPANY" as const, companyId: subject.companyId, role }] : []),
        { scope: "USER" as const, userId: subject.userId },
      ],
    },
  })
  const rules: PermissionRuleData[] = rows.map((r) => ({
    scope: r.scope,
    role: r.role as Role | null,
    companyId: r.companyId,
    userId: r.userId,
    module: r.module,
    allowed: r.allowed,
  }))
  cache.set(key, { at: Date.now(), rules })
  return rules
}

export async function canAccessModule(subject: PermissionSubject, module: string): Promise<boolean> {
  return resolveAccess(subject, module, await loadRulesFor(subject)).allowed
}

export async function modulesFor(subject: PermissionSubject): Promise<string[]> {
  return allowedModules(subject, await loadRulesFor(subject))
}
