import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"
import { factusRequest, getNumberingRangeByDocumentType } from "@/lib/factus/client"
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

  const previousReturns = await prisma.sale.findMany({
    where: {
      parentSaleId: saleId,
      isReturn: true,
    },
    include: { items: true },
  })

  const returnedQuantities: Record<string, number> = {}
  for (const ret of previousReturns) {
    for (const retItem of ret.items) {
      returnedQuantities[retItem.productId] = (returnedQuantities[retItem.productId] || 0) + retItem.quantity
    }
  }

  for (const item of items) {
    const originalItem = originalSale.items.find((i) => i.productId === item.productId)
    if (!originalItem) {
      return NextResponse.json({ error: `Producto no encontrado en la venta original` }, { status: 400 })
    }

    const alreadyReturned = returnedQuantities[item.productId] || 0
    const maxReturnable = originalItem.quantity - alreadyReturned

    if (item.quantity > maxReturnable) {
      return NextResponse.json({
        error: `Cantidad a devolver excede la disponible. Vendidas: ${originalItem.quantity}, Ya devueltas: ${alreadyReturned}, Disponibles: ${maxReturnable}`
      }, { status: 400 })
    }
  }

  const companyId = session.user.companyId!
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { factusEnabled: true },
  })

  const returnSale = await prisma.$transaction(async (tx) => {
    for (const item of items) {
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
    originalSale.electronicInvoice
  ) {
    try {
      // Get numbering range for credit notes (document type "22")
      const rangeRecord = await getNumberingRangeByDocumentType(companyId, "22")
      const rangeId = rangeRecord?.factusRangeId

      const originalInvoice = originalSale.electronicInvoice
      const creditNotePayload = await mapSaleToFactusCreditNote(
        returnSale as any,
        originalInvoice.consecutive || "",
        rangeId,
        `return-${returnSale.id.slice(0, 8)}-${Date.now()}`,
        1
      )

      const factusResponse = await factusRequest<{
        id: number
        consecutive: string
        cufe: string
        status: string
      }>(
        "/v2/credit-notes/validate",
        { method: "POST", body: creditNotePayload as any },
        companyId
      )

      const responseData = (factusResponse as any).data || factusResponse
      const isValidated = responseData.is_validated === true || factusResponse.status === "accepted" || responseData.status === "Created"

      await prisma.electronicInvoice.create({
        data: {
          companyId,
          saleId: returnSale.id,
          cufe: responseData.cufe || "",
          consecutive: responseData.consecutive || responseData.number || String(responseData.id),
          status: isValidated ? "VALIDATED" : "PENDING",
          factusBillId: String(responseData.id || factusResponse.id),
          total: returnSale.total,
          taxTotal: returnSale.tax,
          validatedAt: isValidated ? new Date() : null,
        },
      })
    } catch (error: any) {
      console.error("Error creating credit note:", error?.message || error)
    }
  }

  return NextResponse.json(returnSale, { status: 201 })
}
