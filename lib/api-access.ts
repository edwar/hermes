import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { canAccess } from "@/lib/navigation"

/** Un rol puede usar un módulo si el menú se lo muestra; el GOD (administrador de plataforma) puede usar todos. */
export function canUseModule(session: Session | null, href: string): boolean {
  const role = session?.user?.role
  return role === "GOD" || canAccess(href, role)
}

/**
 * Para las rutas de la API: 401 sin sesión y 403 si el rol no tiene el módulo.
 * Devuelve la respuesta de error, o null si puede continuar. Ocultar el enlace del menú no protege la ruta.
 */
export function denyUnlessModule(session: Session | null, href: string): NextResponse | null {
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!canUseModule(session, href)) return NextResponse.json({ error: "No tienes permiso" }, { status: 403 })
  return null
}
