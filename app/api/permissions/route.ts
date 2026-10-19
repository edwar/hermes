import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { AUDIT_ACTION } from "@/lib/constants"
import { guardModule } from "@/lib/permissions/guard"
import { getMatrix, getUserMatrix, resetRole, resetUser, setRule, setUserRule } from "@/lib/permissions/admin"
import { isAssignableRole } from "@/lib/permissions/user-management"

// Permisos del equipo de la propia empresa, para su dueño. El dueño administra a su Gerente, Gestor y Cajero,
// y a las personas de su empresa: nunca a otra empresa, ni a otro dueño, ni a sí mismo. El GOD usa /api/god/permissions.

/** Roles que el dueño puede configurar (no el suyo). */
const TEAM_ROLES = ["ADMIN", "MANAGER", "CASHIER"]

async function requireOwner() {
  const guard = await guardModule("/permissions")
  if ("error" in guard) return { error: guard.error }
  const companyId = guard.session.user.companyId
  if (!companyId) {
    return { error: NextResponse.json({ error: "El administrador de plataforma usa la pantalla de Configuración del Sistema" }, { status: 400 }) }
  }
  return { session: guard.session, companyId }
}

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null)

export async function GET(req: NextRequest) {
  const guard = await requireOwner()
  if (guard.error) return guard.error
  const userId = text(req.nextUrl.searchParams.get("userId"))
  if (userId) {
    const result = await getUserMatrix(userId, guard.companyId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })
    return NextResponse.json(result.matrix)
  }
  const matrix = await getMatrix(guard.companyId)
  return NextResponse.json({ ...matrix, roles: matrix.roles.filter((r) => TEAM_ROLES.includes(r)) })
}

export async function PUT(req: NextRequest) {
  const guard = await requireOwner()
  if (guard.error) return guard.error

  const body = (await req.json().catch(() => null)) as { userId?: unknown; role?: unknown; module?: unknown; allowed?: unknown } | null
  if (!body || typeof body.module !== "string" || typeof body.allowed !== "boolean") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const userId = text(body.userId)
  if (userId) {
    const result = await setUserRule({ userId, module: body.module, allowed: body.allowed, onlyCompanyId: guard.companyId })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    await logAudit({
      userId: guard.session.user.id,
      companyId: guard.companyId,
      action: AUDIT_ACTION.PERMISSION_RULE_CHANGED,
      entity: "PermissionRule",
      entityId: userId,
      metadata: { scope: "USER", targetUserId: userId, module: body.module, allowed: body.allowed, action: result.action },
      req,
    })
    const matrix = await getUserMatrix(userId, guard.companyId)
    return NextResponse.json({ success: true, matrix: matrix.ok ? matrix.matrix : null })
  }

  if (!isAssignableRole(body.role) || !TEAM_ROLES.includes(body.role)) {
    return NextResponse.json({ error: "Solo se configuran los permisos del equipo, no los del dueño" }, { status: 400 })
  }
  const result = await setRule({ companyId: guard.companyId, role: body.role, module: body.module, allowed: body.allowed })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  await logAudit({
    userId: guard.session.user.id,
    companyId: guard.companyId,
    action: AUDIT_ACTION.PERMISSION_RULE_CHANGED,
    entity: "PermissionRule",
    metadata: { scope: "COMPANY", role: body.role, module: body.module, allowed: body.allowed, action: result.action },
    req,
  })
  const matrix = await getMatrix(guard.companyId)
  return NextResponse.json({ success: true, matrix: { ...matrix, roles: matrix.roles.filter((r) => TEAM_ROLES.includes(r)) } })
}

/** Quita todas las reglas de un rol (o de una persona) de esta empresa. */
export async function DELETE(req: NextRequest) {
  const guard = await requireOwner()
  if (guard.error) return guard.error

  const userId = text(req.nextUrl.searchParams.get("userId"))
  if (userId) {
    const removed = await resetUser(userId, guard.companyId)
    await logAudit({
      userId: guard.session.user.id,
      companyId: guard.companyId,
      action: AUDIT_ACTION.PERMISSION_RULE_CHANGED,
      entity: "PermissionRule",
      entityId: userId,
      metadata: { scope: "USER", targetUserId: userId, action: "reset", removed },
      req,
    })
    const matrix = await getUserMatrix(userId, guard.companyId)
    return NextResponse.json({ success: true, removed, matrix: matrix.ok ? matrix.matrix : null })
  }

  const role = req.nextUrl.searchParams.get("role")
  if (!isAssignableRole(role) || !TEAM_ROLES.includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
  }
  const removed = await resetRole({ companyId: guard.companyId, role })
  await logAudit({
    userId: guard.session.user.id,
    companyId: guard.companyId,
    action: AUDIT_ACTION.PERMISSION_RULE_CHANGED,
    entity: "PermissionRule",
    metadata: { scope: "COMPANY", role, action: "reset", removed },
    req,
  })
  const matrix = await getMatrix(guard.companyId)
  return NextResponse.json({ success: true, removed, matrix: { ...matrix, roles: matrix.roles.filter((r) => TEAM_ROLES.includes(r)) } })
}
