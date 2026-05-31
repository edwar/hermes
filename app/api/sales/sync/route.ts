import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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

  const existing = await prisma.sale.findFirst({ where: { localId, companyId } })
  if (existing) {
    return NextResponse.json({ message: "Venta ya sincronizada", sale: existing })
  }

  const { items, subtotal, tax, discount, total, paymentMethod, customerId, notes } = parsed.data

  const sale = await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId, companyId } })
      if (!product || product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${product?.name ?? item.productId}`)
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
      await tx.stockMovement.create({
        data: {
          type: "OUT",
          quantity: item.quantity,
          reason: `Venta offline #${localId}`,
          productId: item.productId,
          companyId,
        },
      })
    }

    return tx.sale.create({
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
    })
  })

  return NextResponse.json(sale, { status: 201 })
}
