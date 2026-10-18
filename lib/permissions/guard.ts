import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { auth } from "@/lib/auth"
import { canAccessModule } from "@/lib/permissions"

export type GuardedSession = Session & { user: NonNullable<Session["user"]> }

/**
 * Guard de las rutas de la API: 401 sin sesión, 403 si el rol (o las reglas guardadas) no dan
 * acceso al módulo. Usa lib/permissions, así que respeta las reglas por usuario, empresa y global.
 *
 *   const guard = await guardModule("/inventory")   // o guardModule(["/sales", "/reports"]): cualquiera de los dos
 *   if ("error" in guard) return guard.error
 *   const { session } = guard
 *
 * El test tests/unit/route-access.test.ts verifica que cada ruta registrada como "module"
 * llame a este guard con el módulo que declara.
 */
export async function guardModule(
  modules: string | string[]
): Promise<{ session: GuardedSession } | { error: NextResponse }> {
  const session = await auth()
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  const subject = { userId: session.user.id, role: session.user.role, companyId: session.user.companyId }
  // Con varios módulos basta con tener acceso a uno (p. ej. el historial de ventas lo usan Ventas y Reportes).
  const allowed = (await Promise.all([modules].flat().map((m) => canAccessModule(subject, m)))).some(Boolean)
  if (!allowed) return { error: NextResponse.json({ error: "No tienes permiso" }, { status: 403 }) }
  return { session: session as GuardedSession }
}
