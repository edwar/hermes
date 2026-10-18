// =============================================================================
// ENDPOINT: POST /api/sales/return — DEVOLUCIÓN DE VENTA + NOTA CRÉDITO
// Este endpoint maneja la devolución de productos. Hace 4 cosas clave:
//   1. Valida la venta original y las cantidades a devolver
//   2. Crea una venta con isReturn=true en nuestra DB (total negativo)
//   3. Reintegra el inventario (StockMovement tipo "IN")
//   4. Si se solicita, genera Nota Crédito Electrónica en Factus (DIAN)
// =============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { denyUnlessModule } from "@/lib/api-access"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"
import { emitCreditNoteForReturn } from "@/lib/invoicing/emit"
import { STOCK_MOVEMENT_TYPE } from "@/lib/constants"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const denied = denyUnlessModule(session, "/pos")
  if (denied) return denied

  const body = await req.json()
  const { saleId, items, reason, sessionId, createCreditNote } = body as {
    saleId: string
    items: { productId: string; quantity: number; unitPrice: number; subtotal: number }[]
    reason?: string
    sessionId?: string
    createCreditNote?: boolean
  }

  if (!saleId || !items?.length) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
  }

  // ===========================================================================
  // PASO 1: VALIDAR VENTA ORIGINAL
  // Buscamos la venta original en nuestra DB. Rechazamos si:
  //   - No existe
  //   - Ya es una devolución (no se pueden anidar)
  // ===========================================================================

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

  // ===========================================================================
  // PASO 2: VALIDAR CANTIDADES CONTRA DEVOLUCIONES PREVIAS
  // Un producto no se puede devolver más veces de las que se vendió.
  // Acumulamos todas las devoluciones previas y verificamos que la suma
  // de cantidades devueltas no exceda la cantidad original vendida.
  // ===========================================================================

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
    select: { factusEnabled: true, factusBlocked: true },
  })

  const returnSubtotal = items.reduce((acc: number, i: { subtotal: number }) => acc + i.subtotal, 0)

  // ===========================================================================
  // PASO 3: CREAR LA VENTA DE DEVOLUCIÓN EN NUESTRA DB
  //   - isReturn = true (identifica que es una devolución)
  //   - parentSaleId = ID de la venta original
  //   - total = negativo (representa una reducción en el valor)
  //   - returnReason = motivo de la devolución
  // ===========================================================================

  const returnSale = await withPrismaRetry(
    () =>
      prisma.sale.create({
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
      }),
    "return-sale:create"
  )

  // ===========================================================================
  // PASO 4: REINTEGRAR INVENTARIO
  // Por cada producto devuelto:
  //   - Incrementamos el stock del producto
  //   - Creamos StockMovement con tipo "IN" para auditoría
  // ===========================================================================

  const stockOps = items.flatMap((item) => [
    prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    }),
    prisma.stockMovement.create({
      data: {
        type: STOCK_MOVEMENT_TYPE.IN,
        quantity: item.quantity,
        reason: `Devolución venta #${saleId}`,
        productId: item.productId,
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
        `[return-sale] ${op} failed for product ${items[opIdx]?.productId}:`,
        result.reason
      )
    }
  })

  // ===========================================================================
  // PASO 5: (OPCIONAL) CREAR NOTA CRÉDITO EN FACTUS
  // Solo si:
  //   - createCreditNote = true (el usuario lo solicitó en el modal)
  //   - Factus está habilitado y no bloqueado
  //   - La venta original tiene factura electrónica asociada
  //
  // Una Nota Crédito es el documento electrónico que anula parcial o
  // totalmente una factura electrónica ante DIAN.
  //
  // Flujo:
  //   a) Obtenemos rango de numeración activo para notas crédito (doc "22")
  //   b) Buscamos la factura original en Factus para obtener su ID interno
  //   c) Mapeamos la devolución al payload de nota crédito de Factus/DIAN
  //   d) Enviamos a POST /v2/credit-notes/validate
  //   e) Guardamos el resultado (CUFE, consecutivo) en ElectronicInvoice
  //   f) Auditamos
  // ===========================================================================

  let creditNoteResult = null

  if (createCreditNote && originalSale.electronicInvoice) {
    try {
      creditNoteResult = await emitCreditNoteForReturn(returnSale.id, companyId, session.user.id)
    } catch (error) {
      console.error("Error emitiendo nota crédito:", error)
      creditNoteResult = { status: "error", reason: "No se pudo emitir la nota crédito" }
    }
  }

  // --- Respuesta final: devolvemos la venta de devolución ---
  return NextResponse.json({ ...returnSale, creditNote: creditNoteResult }, { status: 201 })
}
