import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { USER_ROLE, SORT_DIRECTION } from "@/lib/constants"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== USER_ROLE.GOD) return NextResponse.json({ error: "Solo GOD" }, { status: 403 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [
    totalCompanies,
    activeCompanies,
    factusEnabled,
    factusBlocked,
    creditSummary,
    monthSales,
    lowCreditCompanies,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { isActive: true } }),
    prisma.company.count({ where: { factusEnabled: true } }),
    prisma.company.count({ where: { factusBlocked: true } }),
    prisma.company.aggregate({
      _sum: { factusCreditBalance: true, factusCreditTotal: true },
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.company.findMany({
      where: { factusEnabled: true, isActive: true, factusCreditBalance: { lte: 10 } },
      select: { id: true, name: true, factusCreditBalance: true },
      orderBy: { factusCreditBalance: SORT_DIRECTION.ASC },
      take: 10,
    }),
  ])

  return NextResponse.json({
    totalCompanies,
    activeCompanies,
    factusEnabled,
    factusBlocked,
    totalCreditsSold: creditSummary._sum.factusCreditTotal ?? 0,
    totalCreditsRemaining: creditSummary._sum.factusCreditBalance ?? 0,
    monthSales: {
      total: Number(monthSales._sum.total ?? 0),
      count: monthSales._count,
    },
    lowCreditCompanies,
  })
}
