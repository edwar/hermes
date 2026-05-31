import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function isAdminOrGod(role: string) {
  return role === "ADMIN" || role === "GOD"
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

  const cashSession = await prisma.cashSession.findUnique({
    where: { id },
    include: {
      cashRegister: true,
      sales: true,
      cashMovements: true,
    },
  })

  if (!cashSession) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  }

  if (cashSession.userId !== session.user.id && !isAdminOrGod(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (session.user.role !== "GOD" && cashSession.cashRegister.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (cashSession.status === "CLOSED") {
    return NextResponse.json({ error: "Esta sesión ya está cerrada" }, { status: 400 })
  }

  const cashSalesTotal = cashSession.sales
    .filter((s) => s.paymentMethod === "CASH" && !s.isReturn)
    .reduce((sum, s) => sum + Number(s.total), 0)

  const cashReturnsTotal = cashSession.sales
    .filter((s) => s.paymentMethod === "CASH" && s.isReturn)
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

  const updated = await prisma.cashSession.update({
    where: { id },
    data: {
      status: "CLOSED",
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
  })

  return NextResponse.json(updated)
}
