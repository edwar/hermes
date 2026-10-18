import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { denyUnlessModule } from "@/lib/api-access"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"
import { PAYMENT_METHOD, SORT_DIRECTION } from "@/lib/constants"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const denied = denyUnlessModule(session, "/cajas")
  if (denied) return denied

  const { id } = await params

  const scope = companyScope(session)
  const cashSession = await withPrismaRetry(
    () =>
      prisma.cashSession.findFirst({
        where: {
          id,
          ...(scope.companyId ? { cashRegister: { companyId: scope.companyId } } : {}),
        },
        include: {
          cashRegister: true,
          user: { select: { id: true, name: true, email: true } },
          sales: {
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: SORT_DIRECTION.ASC },
          },
          cashMovements: { orderBy: { createdAt: SORT_DIRECTION.ASC } },
        },
      }),
    "cash-sessions:report"
  )

  if (!cashSession) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  }

  const salesByMethod = {
    [PAYMENT_METHOD.CASH]: cashSession.sales.filter((s) => s.paymentMethod === PAYMENT_METHOD.CASH && !s.isReturn),
    [PAYMENT_METHOD.CARD]: cashSession.sales.filter((s) => s.paymentMethod === PAYMENT_METHOD.CARD && !s.isReturn),
    [PAYMENT_METHOD.TRANSFER]: cashSession.sales.filter((s) => s.paymentMethod === PAYMENT_METHOD.TRANSFER && !s.isReturn),
    [PAYMENT_METHOD.CREDIT]: cashSession.sales.filter((s) => s.paymentMethod === PAYMENT_METHOD.CREDIT && !s.isReturn),
  }

  const returns = cashSession.sales.filter((s) => s.isReturn)

  return NextResponse.json({
    session: cashSession,
    summary: {
      salesCount: cashSession.sales.filter((s) => !s.isReturn).length,
      returnsCount: returns.length,
      totalSales: cashSession.sales.filter((s) => !s.isReturn).reduce((sum, s) => sum + Number(s.total), 0),
      totalReturns: returns.reduce((sum, s) => sum + Number(s.total), 0),
    },
    salesByMethod,
    returns,
  })
}
