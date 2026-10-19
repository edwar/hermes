import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { AUDIT_ACTION, USER_ROLE } from "@/lib/constants"
import { getMatrix, resetRole, setRule } from "@/lib/permissions/admin"
import { isAssignableRole } from "@/lib/permissions/user-management"

// Permisos por rol, globales o de una empresa. Solo el administrador de plataforma (GOD).

async function requireGod() {
  const session = await auth()
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  if (session.user.role !== USER_ROLE.GOD) {
    return { error: NextResponse.json({ error: "Solo el administrador de plataforma puede ver los permisos" }, { status: 403 }) }
  }
  return { session }
}

const companyIdOf = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null)

export async function GET(req: NextRequest) {
  const guard = await requireGod()
  if (guard.error) return guard.error
  const companyId = companyIdOf(req.nextUrl.searchParams.get("companyId"))
  return NextResponse.json(await getMatrix(companyId))
}

export async function PUT(req: NextRequest) {
  const guard = await requireGod()
  if (guard.error) return guard.error

  const body = (await req.json().catch(() => null)) as { companyId?: unknown; role?: unknown; module?: unknown; allowed?: unknown } | null
  if (!body || !isAssignableRole(body.role) || typeof body.module !== "string" || typeof body.allowed !== "boolean") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }
  const companyId = companyIdOf(body.companyId)

  const result = await setRule({ companyId, role: body.role, module: body.module, allowed: body.allowed })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  await logAudit({
    userId: guard.session!.user.id,
    companyId,
    action: AUDIT_ACTION.PERMISSION_RULE_CHANGED,
    entity: "PermissionRule",
    metadata: { scope: companyId ? "COMPANY" : "GLOBAL", role: body.role, module: body.module, allowed: body.allowed, action: result.action },
    req,
  })

  return NextResponse.json({ success: true, ...(await getMatrix(companyId).then((m) => ({ matrix: m }))) })
}

/** Quita todas las reglas de un rol en ese nivel (vuelve a lo heredado). */
export async function DELETE(req: NextRequest) {
  const guard = await requireGod()
  if (guard.error) return guard.error

  const role = req.nextUrl.searchParams.get("role")
  if (!isAssignableRole(role)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
  const companyId = companyIdOf(req.nextUrl.searchParams.get("companyId"))

  const removed = await resetRole({ companyId, role })
  await logAudit({
    userId: guard.session!.user.id,
    companyId,
    action: AUDIT_ACTION.PERMISSION_RULE_CHANGED,
    entity: "PermissionRule",
    metadata: { scope: companyId ? "COMPANY" : "GLOBAL", role, action: "reset", removed },
    req,
  })

  return NextResponse.json({ success: true, removed, matrix: await getMatrix(companyId) })
}
