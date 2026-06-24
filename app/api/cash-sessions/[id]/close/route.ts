import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { USER_ROLE, AUDIT_ACTION } from "@/lib/constants"
import { PAYMENT_METHOD } from "@/lib/constants"
import { CASH_SESSION_STATUS } from "@/lib/constants"

function isAdminOrGod(role: string) {
  return role === USER_ROLE.OWNER || role === USER_ROLE.ADMIN || role === USER_ROLE.GOD
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { closingBalance, notes } = body

  if (closingBalance === undefined || closingBalance < 0) {
    return NextResponse.json({ error: "El monto contado es requerido" }, { status: 400 })
  }

  const cashSession = await withPrismaRetry(
    () =>
      prisma.cashSession.findUnique({
        where: { id },
        include: {
          cashRegister: true,
          sales: true,
          cashMovements: true,
        },
      }),
    "cash-sessions:close-lookup"
  )

  if (!cashSession) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  }

  if (cashSession.userId !== session.user.id && !isAdminOrGod(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (session.user.role !== USER_ROLE.GOD && cashSession.cashRegister.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (cashSession.status === CASH_SESSION_STATUS.CLOSED) {
    return NextResponse.json({ error: "Esta sesión ya está cerrada" }, { status: 400 })
  }

  const cashSalesTotal = cashSession.sales
    .filter((s) => s.paymentMethod === PAYMENT_METHOD.CASH && !s.isReturn)
    .reduce((sum, s) => sum + Number(s.total), 0)

  const cashReturnsTotal = cashSession.sales
    .filter((s) => s.paymentMethod === PAYMENT_METHOD.CASH && s.isReturn)
    .reduce((sum, s) => sum + Number(s.total), 0)

  const movementsIn = cashSession.cashMovements
    .filter((m) => m.type === "IN")
    .reduce((sum, m) => sum + Number(m.amount), 0)

  const movementsOut = cashSession.cashMovements
    .filter((m) => m.type === "OUT")
    .reduce((sum, m) => sum + Number(m.amount), 0)

  const expectedClosing =
    Number(cashSession.openingBalance) + cashSalesTotal + cashReturnsTotal + movementsIn - movementsOut

  const difference = closingBalance - expectedClosing

  const updated = await withPrismaRetry(
    () =>
      prisma.cashSession.update({
        where: { id },
        data: {
          status: CASH_SESSION_STATUS.CLOSED,
          closingBalance,
          expectedClosing,
          difference,
          closedAt: new Date(),
          notes: notes || null,
        },
        include: {
          cashRegister: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    "cash-sessions:close-update"
  )

  await logAudit({
    userId: session.user.id, companyId: session.user.companyId,     action: AUDIT_ACTION.CASH_SESSION_CLOSED,
    entity: "CashSession", entityId: id, req,
  })

  return NextResponse.json(updated)
}
