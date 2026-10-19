import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { allowedModules, loadRulesFor, resolveAccess } from "@/lib/permissions"

// Primer módulo al que mandar a quien intenta entrar a una pantalla que no puede usar.
const HOME_ORDER = ["/dashboard", "/pos", "/god-dashboard", "/profile"]

/**
 * Guard de las pantallas: cada módulo tiene un layout.tsx que lo llama. Se usa un layout por módulo
 * (y no uno solo en la raíz) porque Next conserva los layouts al navegar y no los vuelve a evaluar;
 * el de cada módulo sí se renderiza al entrar. Sin permiso redirige a la primera pantalla permitida.
 * El proxy solo comprueba la sesión (no consulta la base de datos en cada prefetch).
 */
export async function requireModule(modules: string | string[]) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const subject = { userId: session.user.id, role: session.user.role, companyId: session.user.companyId }
  const rules = await loadRulesFor(subject)
  if ([modules].flat().some((m) => resolveAccess(subject, m, rules).allowed)) return session

  const allowed = new Set(allowedModules(subject, rules))
  redirect(HOME_ORDER.find((m) => allowed.has(m)) ?? "/profile")
}
