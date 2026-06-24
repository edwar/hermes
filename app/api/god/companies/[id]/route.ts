import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { USER_ROLE, SORT_DIRECTION } from "@/lib/constants"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== USER_ROLE.GOD) return NextResponse.json({ error: "Solo GOD" }, { status: 403 })

  const { id } = await params

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, products: true, customers: true, sales: true } },
    },
  })

  if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [monthSales, creditTransactions, recentSales, recentAuditLogs] = await Promise.all([
    prisma.sale.aggregate({
      where: { companyId: id, createdAt: { gte: startOfMonth } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.factusCreditTransaction.findMany({
      where: { companyId: id },
      orderBy: { createdAt: SORT_DIRECTION.DESC },
      take: 10,
    }),
    prisma.sale.findMany({
      where: { companyId: id },
      orderBy: { createdAt: SORT_DIRECTION.DESC },
      take: 5,
      include: { user: { select: { name: true } }, customer: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      where: { companyId: id },
      orderBy: { createdAt: SORT_DIRECTION.DESC },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
  ])

  return NextResponse.json({
    company,
    monthSales: {
      total: Number(monthSales._sum.total ?? 0),
      count: monthSales._count,
    },
    creditTransactions,
    recentSales,
    recentAuditLogs,
  })
}
