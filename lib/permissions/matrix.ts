// Matriz de permisos que ve el administrador de plataforma: cada rol × cada módulo configurable, con el
// valor efectivo, de dónde viene y si está bloqueado. Lógica pura (sin base de datos) para poder probarla.

import { MODULE_LABELS } from "../navigation"
import {
  ALWAYS_ALLOWED_MODULES,
  KNOWN_MODULES,
  OWNER_LOCKED_MODULES,
  PLATFORM_MODULES,
  resolveAccess,
  type PermissionRuleData,
} from "./resolve"
import { ASSIGNABLE_ROLES } from "./user-management"
import type { Role } from "../navigation"

export type AssignableRole = Extract<Role, "OWNER" | "ADMIN" | "MANAGER" | "CASHIER">

export interface MatrixCell {
  /** Lo que puede hacer hoy este rol en este módulo (con las reglas aplicadas). */
  allowed: boolean
  /** De dónde sale: el valor por defecto del código, una regla global o una regla de la empresa. */
  source: "default" | "global" | "company" | "owner"
  /** Lo que sería sin la regla de este nivel (a lo que vuelve si se quita). */
  inherited: boolean
  /** Hay una regla guardada en este nivel. */
  overridden: boolean
  /** No se puede cambiar (p. ej. al dueño no se le quitan Usuarios ni Configuración). */
  locked: boolean
}

export interface PermissionMatrix {
  scope: "GLOBAL" | "COMPANY"
  companyId: string | null
  roles: readonly AssignableRole[]
  modules: { module: string; label: string }[]
  cells: Record<string, Record<string, MatrixCell>>
}

/** Los módulos que el GOD puede configurar: sin los de plataforma ni el perfil, que no se conceden ni se quitan. */
export const CONFIGURABLE_MODULES: readonly string[] = KNOWN_MODULES.filter(
  (m) => !PLATFORM_MODULES.includes(m) && !ALWAYS_ALLOWED_MODULES.includes(m)
)

const SCOPE_OF = (companyId: string | null) => (companyId ? "COMPANY" : "GLOBAL")

function isRuleOfLevel(r: PermissionRuleData, role: string, module: string, companyId: string | null) {
  if (r.module !== module || r.role !== role) return false
  return companyId ? r.scope === "COMPANY" && r.companyId === companyId : r.scope === "GLOBAL"
}

/**
 * `rules` debe traer las reglas globales y, si se mira una empresa, las de esa empresa.
 * Vista global (companyId null): global sobre el valor por defecto. Vista de empresa: la empresa
 * sobre global sobre el valor por defecto.
 */
export function buildMatrix(rules: readonly PermissionRuleData[], companyId: string | null): PermissionMatrix {
  const cells: PermissionMatrix["cells"] = {}
  for (const role of ASSIGNABLE_ROLES) {
    cells[role] = {}
    for (const mod of CONFIGURABLE_MODULES) {
      const subject = { userId: "", role, companyId }
      const effective = resolveAccess(subject, mod, rules)
      const withoutThisLevel = rules.filter((r) => !isRuleOfLevel(r, role, mod, companyId))
      const inherited = resolveAccess(subject, mod, withoutThisLevel).allowed
      cells[role][mod] = {
        allowed: effective.allowed,
        source: effective.source === "user" || effective.source === "none" || effective.source === "god" || effective.source === "platform" ? "default" : effective.source,
        inherited,
        overridden: rules.some((r) => isRuleOfLevel(r, role, mod, companyId)),
        locked: role === "OWNER" && OWNER_LOCKED_MODULES.includes(mod),
      }
    }
  }
  return {
    scope: SCOPE_OF(companyId),
    companyId,
    roles: ASSIGNABLE_ROLES as readonly AssignableRole[],
    modules: CONFIGURABLE_MODULES.map((mod) => ({ module: mod, label: MODULE_LABELS[mod] ?? mod })),
    cells,
  }
}

/** Qué hacer al fijar un valor: guardar una regla, o quitarla si coincide con lo heredado. */
export function ruleAction(allowed: boolean, inherited: boolean): "set" | "remove" {
  return allowed === inherited ? "remove" : "set"
}
