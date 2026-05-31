import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const scope = companyScope(session)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const whereClause = scope.companyId
    ? `AND s."companyId" = '${scope.companyId}'`
    : ""

  const [
    salesToday,
    salesMonth,
    totalProducts,
    lowStockProducts,
    salesByPaymentMethod,
    topProducts,
    dailySales,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        ...scope,
        createdAt: { gte: today },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: {
        ...scope,
        createdAt: { gte: startOfMonth },
      },
      _sum: { total: true },
    }),
    prisma.product.count({ where: { ...scope, isActive: true } }),
    prisma.product.count({
      where: { ...scope, isActive: true, stock: { lte: 5 } },
    }),
    prisma.sale.groupBy({
      by: ["paymentMethod"],
      where: {
        ...scope,
        createdAt: { gte: startOfMonth },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: { ...scope, createdAt: { gte: startOfMonth } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    prisma.$queryRawUnsafe<{ date: Date; total: bigint; count: bigint }[]>(`
      SELECT DATE(s."createdAt") as date,
             SUM(s.total::numeric) as total,
             COUNT(*)::integer as count
      FROM "Sale" s
      WHERE s."createdAt" >= $1
        ${whereClause}
      GROUP BY DATE(s."createdAt")
      ORDER BY date ASC
    `, thirtyDaysAgo),
  ])

  const topProductIds = topProducts.map((t) => t.productId)
  const products = topProductIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds }, ...scope },
        select: { id: true, name: true },
      })
    : []

  const topProductsWithNames = topProducts.map((t) => ({
    productId: t.productId,
    name: products.find((p) => p.id === t.productId)?.name ?? "Desconocido",
    quantity: t._sum.quantity ?? 0,
    total: Number(t._sum.subtotal ?? 0),
  }))

  return NextResponse.json({
    stats: {
      salesToday: Number(salesToday._sum.total ?? 0),
      ticketsToday: salesToday._count,
      salesMonth: Number(salesMonth._sum.total ?? 0),
      totalProducts,
      lowStockProducts,
    },
    salesByPaymentMethod: salesByPaymentMethod.map((s) => ({
      method: s.paymentMethod,
      total: Number(s._sum.total ?? 0),
      count: s._count,
    })),
    topProducts: topProductsWithNames,
    dailySales: dailySales.map((d) => ({
      date: d.date instanceof Date ? d.date.toISOString().split("T")[0] : d.date,
      total: Number(d.total),
      count: Number(d.count),
    })),
  })
}
