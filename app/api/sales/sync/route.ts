import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { createSaleSchema } from "@/features/pos/schemas/sale-schema"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { localId, data } = body

  if (!localId || !data) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const parsed = createSaleSchema.safeParse(JSON.parse(data))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const companyId = session.user.companyId!

  const existing = await withPrismaRetry(
    () => prisma.sale.findFirst({ where: { localId, companyId } }),
    "sale-sync:lookup"
  )
  if (existing) {
    return NextResponse.json({ message: "Venta ya sincronizada", sale: existing })
  }

  const { items, subtotal, tax, discount, total, paymentMethod, customerId, notes } = parsed.data

  const productIds = items.map((i) => i.productId)
  const products = await withPrismaRetry(
    () =>
      prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
        select: { id: true, name: true, stock: true },
      }),
    "sale-sync:validate-stock"
  )
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)
    if (!product || product.stock < item.quantity) {
      return NextResponse.json(
        { error: `Stock insuficiente para ${product?.name ?? item.productId}` },
        { status: 400 }
      )
    }
  }

  const sale = await withPrismaRetry(
    () =>
      prisma.sale.create({
        data: {
          subtotal,
          tax,
          discount,
          total,
          paymentMethod,
          notes,
          localId,
          isSynced: true,
          userId: session.user.id,
          companyId,
          customerId: customerId || null,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
      }),
    "sale-sync:create"
  )

  const stockOps = items.flatMap((item) => [
    prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    }),
    prisma.stockMovement.create({
      data: {
        type: "OUT",
        quantity: item.quantity,
        reason: `Venta offline #${localId}`,
        productId: item.productId,
        companyId,
      },
    }),
  ])

  const stockResults = await Promise.allSettled(stockOps)
  stockResults.forEach((result, idx) => {
    if (result.status === "rejected") {
      const opIdx = Math.floor(idx / 2)
      const op = idx % 2 === 0 ? "decrement" : "stock-movement"
      console.error(
        `[sale-sync] ${op} failed for product ${items[opIdx]?.productId}:`,
        result.reason
      )
    }
  })

  return NextResponse.json(sale, { status: 201 })
}
