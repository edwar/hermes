import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { PAYMENT_METHOD } from "@/lib/constants"
import { CASH_SESSION_STATUS } from "@/lib/constants"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const activeSession = await withPrismaRetry(
    () =>
      prisma.cashSession.findFirst({
        where: { userId: session.user.id, status: CASH_SESSION_STATUS.OPEN },
        include: {
          cashRegister: true,
          user: { select: { id: true, name: true } },
          sales: {
            where: { isSynced: true },
          },
          cashMovements: true,
        },
      }),
    "cash-sessions:active-summary"
  )

  if (!activeSession) {
    return NextResponse.json(null)
  }

  const cashSales = activeSession.sales.filter((s) => s.paymentMethod === PAYMENT_METHOD.CASH && !s.isReturn)
  const cardSales = activeSession.sales.filter((s) => s.paymentMethod === PAYMENT_METHOD.CARD && !s.isReturn)
  const transferSales = activeSession.sales.filter((s) => s.paymentMethod === PAYMENT_METHOD.TRANSFER && !s.isReturn)
  const creditSales = activeSession.sales.filter((s) => s.paymentMethod === PAYMENT_METHOD.CREDIT && !s.isReturn)
  const returns = activeSession.sales.filter((s) => s.isReturn)

  const cashTotal = cashSales.reduce((sum, s) => sum + Number(s.total), 0)
  const returnsTotal = returns.reduce((sum, s) => sum + Number(s.total), 0)

  const movementsIn = activeSession.cashMovements
    .filter((m) => m.type === "IN")
    .reduce((sum, m) => sum + Number(m.amount), 0)

  const movementsOut = activeSession.cashMovements
    .filter((m) => m.type === "OUT")
    .reduce((sum, m) => sum + Number(m.amount), 0)

  const expectedCash = Number(activeSession.openingBalance) + cashTotal - returnsTotal + movementsIn - movementsOut

  return NextResponse.json({
    session: {
      id: activeSession.id,
      openingBalance: activeSession.openingBalance,
      openedAt: activeSession.openedAt,
    },
    cashRegister: activeSession.cashRegister,
    user: activeSession.user,
    summary: {
      salesCount: activeSession.sales.filter((s) => !s.isReturn).length,
      returnsCount: returns.length,
      totals: {
        [PAYMENT_METHOD.CASH]: { count: cashSales.length, total: cashTotal },
        [PAYMENT_METHOD.CARD]: { count: cardSales.length, total: cardSales.reduce((sum, s) => sum + Number(s.total), 0) },
        [PAYMENT_METHOD.TRANSFER]: { count: transferSales.length, total: transferSales.reduce((sum, s) => sum + Number(s.total), 0) },
        [PAYMENT_METHOD.CREDIT]: { count: creditSales.length, total: creditSales.reduce((sum, s) => sum + Number(s.total), 0) },
      },
      totalSales: activeSession.sales.filter((s) => !s.isReturn).reduce((sum, s) => sum + Number(s.total), 0),
      totalReturns: returnsTotal,
      movements: {
        in: movementsIn,
        out: movementsOut,
      },
      expectedCash,
      openingBalance: Number(activeSession.openingBalance),
    },
    movements: activeSession.cashMovements,
  })
}
