import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "GOD" && session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No tienes permisos para comprar créditos" }, { status: 403 })
  }

  const body = await req.json()
  const { companyId, amount, notes } = body as { companyId?: string; amount?: number; notes?: string }

  if (!companyId || !amount || amount <= 0) {
    return NextResponse.json({ error: "companyId y amount (positivo) requeridos" }, { status: 400 })
  }

  // Si es ADMIN/OWNER, solo su propia empresa
  if (session.user.role !== "GOD" && session.user.companyId !== companyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const result = await withPrismaRetry(
    () =>
      prisma.$transaction(async (tx) => {
        const company = await tx.company.findUnique({
          where: { id: companyId },
          select: { id: true, factusCreditBalance: true, factusCreditTotal: true },
        })
        if (!company) throw new Error("Empresa no encontrada")

        const newBalance = company.factusCreditBalance + amount

        await tx.company.update({
          where: { id: companyId },
          data: {
            factusCreditBalance: { increment: amount },
            factusCreditTotal: { increment: amount },
          },
        })

        const txRecord = await tx.factusCreditTransaction.create({
          data: {
            companyId,
            type: "PURCHASE",
            amount,
            balanceAfter: newBalance,
            notes: notes || null,
          },
        })

        await logAudit({
          userId: session.user.id,
          companyId,
          action: "FACTUS_CREDITS_PURCHASED",
          entity: "Company",
          entityId: companyId,
          metadata: { amount, balanceAfter: newBalance },
          req,
        })

        return txRecord
      }),
    "factus-credits:transaction"
  )

  return NextResponse.json(result, { status: 201 })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get("companyId")
  const type = searchParams.get("type")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = 20

  // GOD ve todo; OWNER/ADMIN solo su empresa
  if (session.user.role !== "GOD" && companyId && companyId !== session.user.companyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  if (session.user.role !== "GOD" && !companyId) {
    // OWNER/ADMIN sin filter: solo ven su empresa
  }

  const where: Record<string, unknown> = {}
  if (session.user.role !== "GOD") {
    where.companyId = session.user.companyId
  } else if (companyId) {
    where.companyId = companyId
  }
  if (type) where.type = type
  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59.999Z")
  }

  const [transactions, total] = await Promise.all([
    withPrismaRetry(
      () =>
        prisma.factusCreditTransaction.findMany({
          where,
          include: { company: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      "factus-credits:list"
    ),
    prisma.factusCreditTransaction.count({ where }),
  ])

  return NextResponse.json({
    transactions,
    total,
    pages: Math.ceil(total / pageSize),
    page,
  })
}
