import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { receivePurchaseOrderSchema } from "@/features/purchase-orders/schemas/purchase-order-schema"
import { companyScope } from "@/lib/company-scope"
import { USER_ROLE, PO_STATUS } from "@/lib/constants"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== USER_ROLE.OWNER && session.user.role !== USER_ROLE.ADMIN && session.user.role !== USER_ROLE.GOD && session.user.role !== USER_ROLE.MANAGER) {
    return NextResponse.json({ error: "No autorizado para recibir pedidos" }, { status: 403 })
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

  if (order.status === PO_STATUS.RECEIVED) {
    return NextResponse.json({ error: "Este pedido ya fue recibido" }, { status: 400 })
  }

  if (order.status === PO_STATUS.CANCELLED) {
    return NextResponse.json({ error: "Este pedido fue cancelado" }, { status: 400 })
  }

  const stockOps = items.flatMap((item) => [
    prisma.product.update({
      where: { id: item.productId },
      data: {
        stock: { increment: item.quantity },
        purchasePrice: item.purchasePrice,
      },
    }),
    prisma.stockMovement.create({
      data: {
        type: "IN",
        quantity: item.quantity,
        reason: `Entrada por pedido #${id.slice(0, 8)}`,
        productId: item.productId,
        purchaseOrderId: id,
        companyId,
      },
    }),
  ])

  const stockResults = await Promise.allSettled(stockOps)
  stockResults.forEach((result, idx) => {
    if (result.status === "rejected") {
      const opIdx = Math.floor(idx / 2)
      const op = idx % 2 === 0 ? "increment" : "stock-movement"
      console.error(
        `[po-receive] ${op} failed for product ${items[opIdx]?.productId}:`,
        result.reason
      )
    }
  })

  const result = await withPrismaRetry(
    () =>
      prisma.purchaseOrder.update({
        where: { id },
        data: { status: PO_STATUS.RECEIVED },
        include: {
          supplier: true,
          user: { select: { id: true, name: true } },
          items: { include: { product: true } },
        },
      }),
    "po-receive:update-status"
  )

  return NextResponse.json(result)
}
