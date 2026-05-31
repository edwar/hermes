import type { Session } from "next-auth"

export function companyScope(session: Session | null): Record<string, string> {
  if (!session?.user) return {}
  if (session.user.role === "GOD") return {}
  if (session.user.companyId) return { companyId: session.user.companyId }
  return {}
}
