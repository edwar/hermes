import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")
  const status = searchParams.get("status") ?? ""
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""

  const scope = companyScope(session)
  const where: Record<string, unknown> = { ...scope }
  if (status) where.status = status
  if (from) where.openedAt = { ...(where.openedAt as Record<string, unknown> || {}), gte: new Date(from) }
  if (to) where.openedAt = { ...(where.openedAt as Record<string, unknown> || {}), lte: new Date(to + "T23:59:59.999Z") }

  const [sessions, total] = await Promise.all([
    prisma.cashSession.findMany({
      where,
      include: {
        cashRegister: true,
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { sales: true } },
      },
      orderBy: { openedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cashSession.count({ where }),
  ])

  return NextResponse.json({ sessions, total, pages: Math.ceil(total / pageSize), page })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { cashRegisterId, openingBalance } = body

  if (!cashRegisterId) {
    return NextResponse.json({ error: "Debes seleccionar una caja" }, { status: 400 })
  }

  if (openingBalance === undefined || openingBalance < 0) {
    return NextResponse.json({ error: "La base inicial es requerida y debe ser mayor o igual a 0" }, { status: 400 })
  }

  const scope = companyScope(session)
  const registerWhere = { id: cashRegisterId, ...scope, isActive: true }
  const register = await prisma.cashRegister.findUnique({ where: registerWhere })
  if (!register) {
    return NextResponse.json({ error: "Caja no encontrada o inactiva" }, { status: 400 })
  }

  const activeSession = await prisma.cashSession.findFirst({
    where: { userId: session.user.id, status: "OPEN" },
  })
  if (activeSession) {
    return NextResponse.json({ error: "Ya tienes una sesión abierta. Ciérrala antes de abrir otra." }, { status: 400 })
  }

  const cashSession = await prisma.cashSession.create({
    data: {
      openingBalance,
      cashRegisterId,
      userId: session.user.id,
    },
    include: {
      cashRegister: true,
      user: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(cashSession, { status: 201 })
}