import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const cashSession = await prisma.cashSession.findUnique({
    where: { id, ...companyScope(session) },
    include: {
      cashRegister: true,
      user: { select: { id: true, name: true, email: true } },
      sales: {
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "asc" },
      },
      cashMovements: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!cashSession) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  }

  const salesByMethod = {
    CASH: cashSession.sales.filter((s) => s.paymentMethod === "CASH" && !s.isReturn),
    CARD: cashSession.sales.filter((s) => s.paymentMethod === "CARD" && !s.isReturn),
    TRANSFER: cashSession.sales.filter((s) => s.paymentMethod === "TRANSFER" && !s.isReturn),
    CREDIT: cashSession.sales.filter((s) => s.paymentMethod === "CREDIT" && !s.isReturn),
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
