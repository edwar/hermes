import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { saleId, items, reason, sessionId } = body

  if (!saleId || !items?.length) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
  }

  const scope = companyScope(session)
  const originalSale = await prisma.sale.findFirst({
    where: { id: saleId, ...scope },
    include: { items: true },
  })

  if (!originalSale) {
    return NextResponse.json({ error: "Venta original no encontrada" }, { status: 404 })
  }

  if (originalSale.isReturn) {
    return NextResponse.json({ error: "No se puede devolver una devolución" }, { status: 400 })
  }

  const companyId = session.user.companyId!

  const returnSale = await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const originalItem = originalSale.items.find((i) => i.productId === item.productId)
      if (!originalItem) {
        throw new Error(`Producto ${item.productId} no encontrado en la venta original`)
      }

      if (item.quantity > originalItem.quantity) {
        throw new Error(`Cantidad a devolver excede la vendida para el producto`)
      }

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })

      await tx.stockMovement.create({
        data: {
          type: "IN",
          quantity: item.quantity,
          reason: `Devolución venta #${saleId}`,
          productId: item.productId,
          companyId,
        },
      })
    }

    const returnSubtotal = items.reduce((acc: number, i: { subtotal: number }) => acc + i.subtotal, 0)

    return tx.sale.create({
      data: {
        subtotal: returnSubtotal,
        tax: 0,
        discount: 0,
        total: -returnSubtotal,
        paymentMethod: originalSale.paymentMethod,
        notes: reason || "Devolución",
        isReturn: true,
        parentSaleId: saleId,
        returnReason: reason || null,
        userId: session.user.id,
        sessionId: sessionId || null,
        customerId: originalSale.customerId,
        companyId,
        items: {
          create: items.map((item: { productId: string; quantity: number; unitPrice: number; subtotal: number }) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
      include: { items: { include: { product: true } }, user: true, customer: true },
    })
  })

  return NextResponse.json(returnSale, { status: 201 })
}
