import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"
import { logAudit } from "@/lib/audit"
import { USER_ROLE, AUDIT_ACTION, SORT_DIRECTION } from "@/lib/constants"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const registers = await withPrismaRetry(
    () =>
      prisma.cashRegister.findMany({
        where: companyScope(session),
        orderBy: { name: SORT_DIRECTION.ASC },
      }),
    "cash-registers:list"
  )

  return NextResponse.json(registers)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user.role !== USER_ROLE.OWNER && session.user.role !== USER_ROLE.ADMIN && session.user.role !== USER_ROLE.GOD)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!session.user.companyId) {
    return NextResponse.json({ error: "No tienes una empresa asignada" }, { status: 400 })
  }
  const companyId = session.user.companyId

  const body = await req.json()
  const { name } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
  }

  const where = { name: name.trim(), ...companyScope(session) }
  const existing = await withPrismaRetry(
    () => prisma.cashRegister.findFirst({ where }),
    "cash-registers:duplicate-check"
  )
  if (existing) {
    return NextResponse.json({ error: "Ya existe una caja con ese nombre" }, { status: 400 })
  }

  const register = await withPrismaRetry(
    () =>
      prisma.cashRegister.create({
        data: { name: name.trim(), companyId },
      }),
    "cash-registers:create"
  )

  await logAudit({
    userId: session.user.id, companyId: session.user.companyId,     action: AUDIT_ACTION.CASH_REGISTER_CREATED,
    entity: "CashRegister", entityId: register.id, req,
  })

  return NextResponse.json(register, { status: 201 })
}