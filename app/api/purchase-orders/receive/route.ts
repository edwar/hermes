import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { receivePurchaseOrderSchema } from "@/features/purchase-orders/schemas/purchase-order-schema"
import { companyScope } from "@/lib/company-scope"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD") {
    return NextResponse.json({ error: "Solo administradores pueden recibir pedidos" }, { status: 403 })
  }
  if (!session.user.companyId) {
    return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })
  }
  const companyId = session.user.companyId

  const body = await req.json()
  const parsed = receivePurchaseOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id, items } = parsed.data

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
  }

  if (order.status === "RECEIVED") {
    return NextResponse.json({ error: "Este pedido ya fue recibido" }, { status: 400 })
  }

  if (order.status === "CANCELLED") {
    return NextResponse.json({ error: "Este pedido fue cancelado" }, { status: 400 })
  }

  const result = await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { increment: item.quantity },
          purchasePrice: item.purchasePrice,
        },
      })

      await tx.stockMovement.create({
        data: {
          type: "IN",
          quantity: item.quantity,
          reason: `Entrada por pedido #${id.slice(0, 8)}`,
          productId: item.productId,
          purchaseOrderId: id,
          companyId,
        },
      })
    }

    const updatedOrder = await tx.purchaseOrder.update({
      where: { id },
      data: { status: "RECEIVED" },
      include: {
        supplier: true,
        user: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    })

    return updatedOrder
  })

  return NextResponse.json(result)
}
