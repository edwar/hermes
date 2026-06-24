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
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"
import { listNumberingRanges, getInvoice, factusRequest } from "@/lib/factus/client"
import { mapSaleToFactusCreditNote } from "@/lib/factus/mappers"
import { logAudit } from "@/lib/audit"
import { STOCK_MOVEMENT_TYPE, AUDIT_ACTION, FE_STATUS, FACTUS_DOCUMENT_TYPE, HTTP_METHOD } from "@/lib/constants"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

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

  if (
    createCreditNote &&
    company?.factusEnabled &&
    !company.factusBlocked &&
    originalSale.electronicInvoice
  ) {
    try {
      // --- Obtener rango de numeración activo para notas crédito ---
      const rawRanges = await listNumberingRanges(companyId, { document: FACTUS_DOCUMENT_TYPE.CREDIT_NOTE });
      const inner = (rawRanges as any)?.data;
      const allRanges = Array.isArray(inner) ? inner : (inner as any)?.data ?? [];
      const activeRange = allRanges.find((r: any) => r.is_active === true || r.is_active === 1);

      if (!activeRange) {
        throw new Error(
          `No se encontró un rango de numeración activo para notas crédito (documento ${FACTUS_DOCUMENT_TYPE.CREDIT_NOTE}) en Factus.`
        );
      }

      // --- Verificar que la factura original tenga un número válido en Factus ---
      const originalInvoice = originalSale.electronicInvoice;
      const billIdentifier = originalInvoice.consecutive || originalInvoice.factusBillId;
      if (!billIdentifier || billIdentifier === 'unknown') {
        throw new Error(
          'La factura original no se creó correctamente en Factus (sin número de factura). ' +
          'Regenera la factura electrónica para esta venta e intenta la devolución nuevamente.'
        );
      }

      // --- Obtener la factura original desde Factus para referenciarla en la nota crédito ---
      const factusInvoice = await getInvoice(billIdentifier, companyId) as any;
      const factusId = Number(factusInvoice?.data?.id ?? factusInvoice?.id);
      const billId = isNaN(factusId) ? undefined : factusId;

      // --- Mapear la devolución al formato de nota crédito de Factus/DIAN ---
      const creditNotePayload = await mapSaleToFactusCreditNote(
        returnSale as any,
        billIdentifier,
        activeRange.id,
        `return-${returnSale.id.slice(0, 8)}-${Date.now()}`,
        1,
        billId
      );

      // --- Enviar la nota crédito a Factus (POST /v2/credit-notes/validate) ---
      const factusResponse = await factusRequest<{
        id: number;
        consecutive: string;
        cufe: string;
        status: string;
      }>("/v2/credit-notes/validate", { method: HTTP_METHOD.POST, body: creditNotePayload as any }, companyId);

      const responseData = (factusResponse as any).data || factusResponse;
      const isValidated =
        responseData.is_validated === true ||
        responseData.status === "validated" ||
        factusResponse.status === "accepted";

      // --- Guardar la nota crédito en nuestra DB (misma tabla ElectronicInvoice) ---
      const electronicInvoice = await prisma.electronicInvoice.create({
        data: {
          companyId,
          saleId: returnSale.id,
          cufe: responseData.cufe || factusResponse.cufe || "",
          consecutive: responseData.number || factusResponse.consecutive || String(responseData.id || factusResponse.id),
          status: isValidated ? FE_STATUS.VALIDATED : FE_STATUS.PENDING,
          factusBillId: String(responseData.id || factusResponse.id || responseData.number || factusResponse.consecutive),
          total: returnSale.total,
          taxTotal: returnSale.tax,
        },
      });

      // --- Auditar la creación de la nota crédito ---
      await logAudit({
        userId: session.user.id, companyId: session.user.companyId, action: AUDIT_ACTION.FACTUS_CREDIT_NOTE_CREATED,
        entity: "ElectronicInvoice", entityId: electronicInvoice.id, req,
      })
    } catch (error: any) {
      console.error("Error preparando nota crédito:", error?.message || error);
      if (error?.factusData) {
        console.error("Factus error completo:", JSON.stringify(error.factusData, null, 2));
      } else if (error?.details) {
        console.error("Detalles:", JSON.stringify(error.details, null, 2));
      }
    }
  }

  // --- Respuesta final: devolvemos la venta de devolución ---
  return NextResponse.json(returnSale, { status: 201 })
}
