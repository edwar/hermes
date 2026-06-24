import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { compare } from "bcryptjs"
import { logAudit } from "@/lib/audit"
import { USER_ROLE, AUDIT_ACTION, CASH_SESSION_STATUS } from "@/lib/constants"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { type, amount, reason, sessionId, adminPassword } = body

  if (!type || !["IN", "OUT"].includes(type)) {
    return NextResponse.json({ error: "Tipo de movimiento inválido" }, { status: 400 })
  }

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 })
  }

  if (!reason?.trim()) {
    return NextResponse.json({ error: "La razón es requerida" }, { status: 400 })
  }

  if (!sessionId) {
    return NextResponse.json({ error: "Sesión de caja requerida" }, { status: 400 })
  }

  const cashSession = await withPrismaRetry(
    () =>
      prisma.cashSession.findFirst({
        where: { id: sessionId },
        include: { cashRegister: true },
      }),
    "cash-movements:session-lookup"
  )

  if (!cashSession || cashSession.status !== CASH_SESSION_STATUS.OPEN) {
    return NextResponse.json({ error: "La sesión de caja no está abierta" }, { status: 400 })
  }

  if (session.user.role === USER_ROLE.GOD) {
    // GOD puede hacer cualquier cosa
  } else if (session.user.role === USER_ROLE.OWNER || session.user.role === USER_ROLE.ADMIN) {
    // OWNER/ADMIN solo puede hacer movimientos en su empresa
    if (cashSession.cashRegister.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  } else {
    // CASHIER requiere autorización de admin
    if (cashSession.cashRegister.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (!adminPassword) {
      return NextResponse.json({ error: "AUTHORIZATION_REQUIRED", requiresAdmin: true }, { status: 403 })
    }

    const adminUser = await withPrismaRetry(
      () =>
        prisma.user.findFirst({
          where: { role: USER_ROLE.ADMIN, companyId: session.user.companyId, isActive: true },
        }),
      "cash-movements:admin-lookup"
    )

    if (!adminUser) {
      return NextResponse.json({ error: "No hay administradores para autorizar" }, { status: 400 })
    }

    const isValid = await compare(adminPassword, adminUser.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: "Contraseña de administrador incorrecta" }, { status: 400 })
    }
  }

  const movement = await withPrismaRetry(
    () =>
      prisma.cashMovement.create({
        data: {
          type,
          amount,
          reason: reason.trim(),
          sessionId,
        },
      }),
    "cash-movements:create"
  )

  await logAudit({
    userId: session.user.id, companyId: session.user.companyId,     action: AUDIT_ACTION.CASH_MOVEMENT_CREATED,
    entity: "CashMovement", entityId: movement.id, metadata: { type, amount, reason: reason.trim() }, req,
  })

  return NextResponse.json(movement, { status: 201 })
}
