// =============================================================================
// QUIÉN PUEDE CREAR Y EDITAR A QUIÉN — reglas puras (sin base de datos)
// El acceso al módulo Usuarios lo decide guardModule("/users"); estas reglas son aparte: dicen
// qué roles puede asignar cada quien y a qué usuarios puede modificar. Evitan, por ejemplo,
// que un ADMIN se convierta en GOD o cambie la contraseña del dueño.
// =============================================================================

/** Roles que se pueden asignar desde la aplicación. GOD nunca: el administrador de plataforma no se crea aquí. */
export const ASSIGNABLE_ROLES = ["OWNER", "ADMIN", "MANAGER", "CASHIER"] as const
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

export function isAssignableRole(role: unknown): role is AssignableRole {
  return typeof role === "string" && (ASSIGNABLE_ROLES as readonly string[]).includes(role)
}

/** Roles que `actorRole` puede dar a otra persona: el ADMIN solo puede dar los de menor nivel. */
export function canAssignRole(actorRole: string | null | undefined, newRole: string): boolean {
  if (!isAssignableRole(newRole)) return false
  if (actorRole === "GOD" || actorRole === "OWNER") return true
  if (actorRole === "ADMIN") return newRole === "MANAGER" || newRole === "CASHIER"
  return false
}

/**
 * ¿Puede `actor` modificar a `target`? (La empresa se comprueba aparte, en la consulta.)
 * El GOD nunca se modifica por aquí; el ADMIN solo toca a Gestores, Cajeros y a sí mismo.
 */
export function canManageUser(
  actor: { id: string; role: string | null | undefined },
  target: { id: string; role: string }
): boolean {
  if (target.role === "GOD") return false
  if (actor.role === "GOD" || actor.role === "OWNER") return true
  if (actor.role === "ADMIN") return actor.id === target.id || target.role === "MANAGER" || target.role === "CASHIER"
  return false
}

/** Cambios que nadie puede hacerse a sí mismo: cambiar su propio rol o desactivarse (se quedaría sin acceso). */
export function selfChangeError(
  actorId: string,
  targetId: string,
  data: { role?: string; isActive?: boolean },
  currentRole: string
): string | null {
  if (actorId !== targetId) return null
  if (data.role !== undefined && data.role !== currentRole) return "No puedes cambiar tu propio rol"
  if (data.isActive === false) return "No puedes desactivar tu propia cuenta"
  return null
}
