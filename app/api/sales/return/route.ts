import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"
import { factusRequest } from "@/lib/factus/client"
import { mapSaleToFactusCreditNote } from "@/lib/factus/mappers"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { saleId, items, reason, sessionId, createCreditNote } = body

  if (!saleId || !items?.length) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
  }

  const scope = companyScope(session)
  const originalSale = await prisma.sale.findFirst({
    where: { id: saleId, ...scope },
    include: {
      items: { include: { product: true } },
      electronicInvoice: true,
      company: true,
    },
  })

  if (!originalSale) {
    return NextResponse.json({ error: "Venta original no encontrada" }, { status: 404 })
  }

  if (originalSale.isReturn) {
    return NextResponse.json({ error: "No se puede devolver una devolución" }, { status: 400 })
  }

  const companyId = session.user.companyId!
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { factusEnabled: true, factusNumberingRangeId: true },
  })

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
      include: { items: { include: { product: true } }, user: true, customer: true, company: true },
    })
  })

  if (
    createCreditNote &&
    company?.factusEnabled &&
    company?.factusNumberingRangeId &&
    originalSale.electronicInvoice
  ) {
    try {
      const originalInvoice = originalSale.electronicInvoice
      const creditNotePayload = mapSaleToFactusCreditNote(
        returnSale as any,
        originalInvoice.consecutive || "",
        company.factusNumberingRangeId,
        `return-${returnSale.id.slice(0, 8)}-${Date.now()}`,
        "1"
      )

      const factusResponse = await factusRequest<{
        id: number
        consecutive: string
        cufe: string
        status: string
      }>(
        "/v2/credit-notes/validate",
        { method: "POST", body: JSON.stringify(creditNotePayload) },
        companyId
      )

      await prisma.electronicInvoice.create({
        data: {
          companyId,
          saleId: returnSale.id,
          cufe: factusResponse.cufe,
          consecutive: factusResponse.consecutive,
          status: factusResponse.status === "accepted" ? "VALIDATED" : "PENDING",
          factusBillId: String(factusResponse.id),
          total: returnSale.total,
          taxTotal: returnSale.tax,
          validatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error("Error creating credit note:", error)
    }
  }

  return NextResponse.json(returnSale, { status: 201 })
}
