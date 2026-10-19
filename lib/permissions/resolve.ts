// =============================================================================
// RESOLUCIÓN DE PERMISOS POR MÓDULO — lógica pura, sin base de datos
// Un módulo es la ruta del menú ("/inventory"); NAV_ACCESS (lib/navigation.ts) define el acceso
// por defecto de cada rol. Las reglas guardadas lo sobrescriben en capas y gana la más específica:
//   usuario → empresa (+ rol) → global (+ rol) → valores por defecto del código
// Esta lógica no importa Prisma a propósito, para poder probarla sin DATABASE_URL (como en CI).
// =============================================================================

import { ALL_ROLES, NAV_ACCESS, rolesFor, type Role } from "../navigation"

export type PermissionScope = "GLOBAL" | "COMPANY" | "USER"

export interface PermissionRuleData {
  scope: PermissionScope
  role: Role | null
  companyId: string | null
  userId: string | null
  module: string
  allowed: boolean
}

export interface PermissionSubject {
  userId: string
  role: string | null | undefined
  companyId: string | null | undefined
}

export type AccessSource = "none" | "god" | "platform" | "owner" | "user" | "company" | "global" | "default"

/** Módulos de plataforma: por defecto solo el GOD. Nunca se conceden a una empresa ni a un usuario normal. */
export const PLATFORM_MODULES: readonly string[] = Object.entries(NAV_ACCESS)
  .filter(([, roles]) => roles.length === 1 && roles[0] === "GOD")
  .map(([module]) => module)

/** El dueño nunca pierde estos módulos, para que nadie se quede sin forma de corregir los permisos. */
export const OWNER_LOCKED_MODULES: readonly string[] = ["/users", "/settings"]

/** Solo el dueño (y el GOD) los usan; ninguna regla los concede a otro rol ni a otra persona. */
export const OWNER_ONLY_MODULES: readonly string[] = ["/permissions"]

/** Todos los roles de la aplicación pueden abrir su perfil: es el destino seguro si no tienen acceso a nada más. */
export const ALWAYS_ALLOWED_MODULES: readonly string[] = ["/profile"]

export const KNOWN_MODULES: readonly string[] = Object.keys(NAV_ACCESS)

export function isKnownModule(module: string): boolean {
  return module in NAV_ACCESS
}

/** Identifica a quién aplica una regla; es la parte de la clave única (subject, module). */
export function subjectKey(rule: Pick<PermissionRuleData, "scope" | "role" | "companyId" | "userId">): string {
  if (rule.scope === "GLOBAL") return `GLOBAL:${rule.role}`
  if (rule.scope === "COMPANY") return `COMPANY:${rule.companyId}:${rule.role}`
  return `USER:${rule.userId}`
}

/** Valida una regla antes de guardarla (lo usará la pantalla de administración). Devuelve el error o null. */
export function validateRule(rule: PermissionRuleData): string | null {
  if (!isKnownModule(rule.module)) return "Módulo desconocido"
  if (rule.scope === "GLOBAL" && (!rule.role || rule.companyId || rule.userId)) return "Una regla global necesita solo un rol"
  if (rule.scope === "COMPANY" && (!rule.role || !rule.companyId || rule.userId)) return "Una regla de empresa necesita empresa y rol"
  if (rule.scope === "USER" && (!rule.userId || rule.role || rule.companyId)) return "Una regla de usuario necesita solo el usuario"
  if (rule.role === "GOD") return "Las reglas no aplican al administrador de plataforma"
  if (OWNER_ONLY_MODULES.includes(rule.module)) return "Ese permiso es solo del dueño"
  if (!rule.allowed && ALWAYS_ALLOWED_MODULES.includes(rule.module)) return "No se puede quitar el acceso al perfil"
  if (rule.allowed && PLATFORM_MODULES.includes(rule.module)) return "Los módulos de plataforma son solo del administrador de plataforma"
  if (!rule.allowed && rule.role === "OWNER" && OWNER_LOCKED_MODULES.includes(rule.module)) {
    return "No se puede quitar este módulo al dueño"
  }
  return null
}

export function resolveAccess(
  subject: PermissionSubject,
  module: string,
  rules: readonly PermissionRuleData[]
): { allowed: boolean; source: AccessSource } {
  const role = subject.role as Role | null | undefined
  if (!role || !(ALL_ROLES as readonly string[]).includes(role)) return { allowed: false, source: "none" }
  if (role === "GOD") return { allowed: true, source: "god" }
  if (!isKnownModule(module)) return { allowed: false, source: "none" }
  if (ALWAYS_ALLOWED_MODULES.includes(module)) return { allowed: true, source: "default" }
  if (PLATFORM_MODULES.includes(module)) return { allowed: false, source: "platform" }
  if (OWNER_ONLY_MODULES.includes(module)) return { allowed: role === "OWNER", source: "owner" }
  if (role === "OWNER" && OWNER_LOCKED_MODULES.includes(module)) return { allowed: true, source: "owner" }

  const forModule = rules.filter((r) => r.module === module)
  const user = forModule.find((r) => r.scope === "USER" && r.userId === subject.userId)
  if (user) return { allowed: user.allowed, source: "user" }
  const company = forModule.find(
    (r) => r.scope === "COMPANY" && !!subject.companyId && r.companyId === subject.companyId && r.role === role
  )
  if (company) return { allowed: company.allowed, source: "company" }
  const global = forModule.find((r) => r.scope === "GLOBAL" && r.role === role)
  if (global) return { allowed: global.allowed, source: "global" }

  return { allowed: (rolesFor(module) as readonly string[]).includes(role), source: "default" }
}

/**
 * Módulos que muestra el menú. El GOD pasa todos los guards, pero no tiene empresa: las pantallas de
 * empresa (POS, Inventario, Ventas…) no tienen datos para él y lo devuelven a su panel, así que su menú
 * solo trae lo que le corresponde por defecto (Plataforma y Notificaciones).
 */
export function menuModules(role: string | null | undefined, allowed: readonly string[]): string[] {
  if (role !== "GOD") return [...allowed]
  return allowed.filter((m) => (rolesFor(m) as readonly string[]).includes("GOD"))
}

/** Todos los módulos que la persona puede usar. */
export function allowedModules(subject: PermissionSubject, rules: readonly PermissionRuleData[]): string[] {
  return KNOWN_MODULES.filter((m) => resolveAccess(subject, m, rules).allowed)
}
