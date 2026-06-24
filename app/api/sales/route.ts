// =============================================================================
// ENDPOINT: POST /api/sales — CREACIÓN DE VENTA + FACTURA ELECTRÓNICA (FE)
// Este endpoint es el corazón del sistema de ventas. Hace 3 cosas clave:
//   1. Crea la venta en nuestra DB (Prisma/Neon)
//   2. Descuenta inventario
//   3. Si el usuario lo solicitó, genera la Factura Electrónica en Factus (DIAN)
// =============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { createSaleSchema } from "@/features/pos/schemas/sale-schema"
import { mapSaleToFactusInvoice } from "@/lib/factus/mappers"
import { factusRequest, getNumberingRangeByDocumentType, listPendingBills, sendRadianEvent } from "@/lib/factus/client"
import { logAudit } from "@/lib/audit"
import { notifyLowCredit } from "@/lib/notifications"
import { EventCodes, DocumentTypeCodes } from "@/lib/factus/reference-tables"
import { STOCK_MOVEMENT_TYPE, FACTUS_TRANSACTION_TYPE, FACTUS_DOCUMENT_TYPE, AUDIT_ACTION, FE_STATUS, USER_ROLE, HTTP_METHOD, SORT_DIRECTION } from "@/lib/constants"
import z from "zod"

interface FactusResponse {
  id?: number
  number?: string
  consecutive: string
  cufe: string
  qr_code: string
  status: string
  validated_at?: boolean
  is_validated?: boolean
  errors?: string[]
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""

  const where: Record<string, unknown> = {}

  if (session.user.role === USER_ROLE.GOD) {
  } else if (session.user.companyId) {
    where.companyId = session.user.companyId
  } else {
    return NextResponse.json({ sales: [], total: 0, pages: 0, page: 1 })
  }

  if (from || to) {
    where.createdAt = {}
    if (from) {
      const fromDate = new Date(from + "T00:00:00")
        ; (where.createdAt as Record<string, Date>).gte = fromDate
    }
    if (to) {
      const toDate = new Date(to + "T23:59:59.999")
        ; (where.createdAt as Record<string, Date>).lte = toDate
    }
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { items: { include: { product: true } }, user: true, customer: true },
      orderBy: { createdAt: SORT_DIRECTION.DESC },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sale.count({ where }),
  ])

  return NextResponse.json({ sales, total, pages: Math.ceil(total / pageSize), page })
}

// =============================================================================
// PASO 1: CREAR LA VENTA EN NUESTRA BASE DE DATOS (Prisma / Neon)
// =============================================================================
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (!session.user.companyId) {
    return NextResponse.json({ error: "Usuario sin empresa asignada" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = createSaleSchema.safeParse(body)
  if (!parsed.success) {
    const tree = z.treeifyError(parsed.error);
    return NextResponse.json({ error: "Error al crear la venta" + JSON.stringify(tree, null, 2) }, { status: 400 })
  }

  const { items, subtotal, tax, discount, total, paymentMethod, sessionId, customerId, notes, localId, requestElectronicInvoice } = parsed.data
  const companyId = session.user.companyId

  // --- Idempotencia: si el cliente ya envió esta venta (por localId), la devolvemos sin duplicar ---
  if (localId) {
    const existing = await prisma.sale.findFirst({
      where: { localId, companyId },
      include: { items: { include: { product: true } }, user: true, customer: true, company: true, electronicInvoice: true },
    })
    if (existing) {
      return NextResponse.json(existing, { status: 200 })
    }
  }

  // --- Validar que todos los productos tengan stock suficiente ---
  const productIds = items.map((i) => i.productId)
  const products = await withPrismaRetry(
    () =>
      prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
        select: { id: true, name: true, stock: true, companyId: true },
      }),
    "sale:validate-stock"
  )

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)
    if (!product) {
      return NextResponse.json(
        { error: `Producto no encontrado: ${item.productId}` },
        { status: 400 }
      )
    }
    const decrementQty = item.weightInGrams ?? item.quantity
    if (product.stock < decrementQty) {
      return NextResponse.json(
        { error: `Stock insuficiente para ${product.name}` },
        { status: 400 }
      )
    }
  }

  // --- Crear la venta y sus items en una transacción de Prisma ---
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
          userId: session.user.id,
          sessionId: sessionId || null,
          customerId: customerId || null,
          companyId,
          isSynced: true,
          requestElectronicInvoice: requestElectronicInvoice ?? false,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              weightInGrams: item.weightInGrams ?? null,
            })),
          },
        },
        include: { items: { include: { product: true } }, user: true, customer: true, company: true },
      }),
    "sale:create"
  )

  // ===========================================================================
  // PASO 2: DESCONTAR INVENTARIO + REGISTRAR MOVIMIENTO DE STOCK
  // Por cada producto vendido:
  //   - Restamos la cantidad del stock en el producto
  //   - Creamos un registro StockMovement con tipo "OUT" para auditoría
  // ===========================================================================

  const stockOps = items.flatMap((item) => {
    const decrementQty = item.weightInGrams ?? item.quantity
    return [
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: decrementQty } },
      }),
      prisma.stockMovement.create({
        data: {
          type: STOCK_MOVEMENT_TYPE.OUT,
          quantity: decrementQty,
          reason: `Venta #${sale.id.slice(0, 8)}`,
          productId: item.productId,
          companyId,
        },
      }),
    ]
  })

  const stockResults = await Promise.allSettled(stockOps)

  stockResults.forEach((result, idx) => {
    if (result.status === "rejected") {
      const opIdx = Math.floor(idx / 2)
      const op = idx % 2 === 0 ? "decrement" : "stock-movement"
      console.error(
        `[sale] ${op} failed for product ${items[opIdx]?.productId}:`,
        result.reason
      )
    }
  })

  // ===========================================================================
  // PASO 3: FACTURA ELECTRÓNICA (FE) — INTEGRACIÓN CON FACTUS + DIAN
  // Si el usuario marcó "Solicitar Factura Electrónica" en el checkout:
  //   a) Verificamos que Factus esté habilitado y tenga créditos
  //   b) Limpiamos facturas pendientes en Factus (para evitar duplicados)
  //   c) Mapeamos la venta al formato que exige Factus/DIAN
  //   d) Enviamos a POST /v2/bills/validate de Factus
  //   e) Guardamos el resultado (CUFE, consecutivo) en ElectronicInvoice
  //   f) Descontamos 1 crédito de facturación del saldo de la empresa
  //   g) Auditamos todo
  // ===========================================================================

  let electronicInvoiceResult = null

  if (requestElectronicInvoice) {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          factusEnabled: true,
          factusBlocked: true,
          factusCreditBalance: true,
        },
      })

      if (!company?.factusEnabled) {
        console.error("Factus: La empresa no tiene habilitado Factus")
      } else if (company.factusBlocked) {
        console.warn("Factus: Facturación bloqueada para esta empresa. La venta se creó sin FE.")
      } else if ((company.factusCreditBalance ?? 0) <= 0) {
        console.warn("Factus: Saldo de créditos insuficiente. La venta se creó sin FE.")
      } else {
        // --- Obtener el rango de numeración para facturas ---
        const rangeRecord = await getNumberingRangeByDocumentType(companyId, FACTUS_DOCUMENT_TYPE.SALES_INVOICE)
        const numberingRangeId = rangeRecord?.factusRangeId

        // --- Mapear la venta de nuestra DB al payload que entiende Factus/DIAN ---
        const invoicePayload = await mapSaleToFactusInvoice(
          sale as any,
          numberingRangeId,
          `sale-${sale.id.slice(0, 8)}-${Date.now()}`
        )

        // --- Limpiar pendientes de Factus antes de crear la factura ---
        // Factus solo permite tener una factura pendiente a la vez por rango.
        // Si hay facturas previas en estado pendiente (status=0), las destruimos.
        let blockedByDian = false
        try {
          // Busca si hay facturas pendientes en Factus
          const pending = await listPendingBills(companyId)
          console.log(`Factus: Facturas pendientes: ${pending.length}`)
          for (const bill of pending) {
            console.log(`  Factura: id=${bill.id}, num=${bill.number}, ref=${bill.reference_code}, status=${bill.status}`)
            if (bill.reference_code) {
              try {
                //Destruye la factura por referencia
                await factusRequest(
                  `/v2/bills/destroy/reference/${encodeURIComponent(bill.reference_code)}`,
                  { method: HTTP_METHOD.DELETE },
                  companyId
                )
                console.log(`  ✅ Factura destruida por referencia: ${bill.reference_code}`)
              } catch (destroyErr: any) {
                //Si la factura ya fue enviada a DIAN, forzamos aceptación expresa (evento "033")
                // para liberar la cola y luego reintentamos destruir
                const msg = destroyErr?.message?.toLowerCase() ?? ""
                if (msg.includes("dian") || msg.includes("enviado")) {
                  console.warn(`  ⛔ Factura ${bill.number} ya fue enviada a DIAN, no se puede destruir. Intentando aceptación expresa...`)
                  if (bill.number) {
                    try {
                      // Forzamos aceptación expresa para liberar la cola
                      await sendRadianEvent(bill.number, EventCodes.EXPRESS_ACCEPTANCE, companyId, {
                        identification_document_code: sale.customer?.documentType ?? DocumentTypeCodes.CC,
                        identification: sale.customer?.cedula ?? "00000000",
                        dv: sale.customer?.dv ?? "",
                        first_name: sale.customer?.name ?? "Cliente",
                        last_name: "",
                        job_title: "",
                        organization_department: "",
                      })
                      console.log(`  ✅ Express acceptance sent for ${bill.number}, retrying destroy...`)
                      try {
                        // Reintentamos destruir la factura
                        await factusRequest(
                          `/v2/bills/destroy/reference/${encodeURIComponent(bill.reference_code)}`,
                          { method: HTTP_METHOD.DELETE },
                          companyId
                        )
                        console.log(`  ✅ Destruida después de aceptación: ${bill.reference_code}`)
                      } catch {
                        console.warn(`  ⛔ No se pudo destruir la factura ${bill.number} después de aceptación. Debería liberarse pronto.`)
                        blockedByDian = true
                      }
                    } catch (acceptErr: any) {
                      console.error(`  ❌ Aceptación expresa fallida para ${bill.number}:`, acceptErr?.message)
                      blockedByDian = true
                    }
                  } else {
                    // Si la factura no tiene referencia, no podemos destruirla
                    console.warn(`  ⛔ Factura ${bill.number} no tiene referencia, no se puede destruir.`)
                    blockedByDian = true
                  }
                } else {
                  console.error(`  ❌ Falló la destrucción de la factura ${bill.reference_code}:`, destroyErr?.message)
                }
              }
            }
          }
        } catch (cleanupErr) {
          // Error al limpiar facturas pendientes
          console.error("Error al limpiar facturas pendientes en Factus:", cleanupErr)
        }

        if (blockedByDian) {
          console.warn("Factus: no se pudieron limpiar todas las facturas pendientes. " +
            "La venta se creó sin FE.")
        } else {
          // --- Enviar la factura a Factus (POST /v2/bills/validate) ---
          // Factus la recibe, la valida contra las reglas de DIAN y la acusa recibo
          let factusResponse: FactusResponse
          try {
            factusResponse = await factusRequest<FactusResponse>(
              "/v2/bills/validate",
              { method: HTTP_METHOD.POST, body: invoicePayload as any },
              companyId
            )
          } catch (error: any) {
            console.error("Factus error:", error?.message || error)
            throw error
          }

          const responseData = (factusResponse as any).data || factusResponse
          const isValidated = responseData.is_validated === true || factusResponse.status === "Created" || factusResponse.status === "accepted"
          const billNumber = responseData.number || factusResponse.number || 'unknown'

          // --- Guardar el resultado de la FE en nuestra base de datos ---
          // Almacenamos CUFE (código único de factura electrónica), consecutivo, estado
          await prisma.electronicInvoice.create({
            data: {
              companyId,
              saleId: sale.id,
              cufe: responseData.cufe || factusResponse.cufe,
              consecutive: billNumber,
              status: isValidated ? FE_STATUS.VALIDATED : FE_STATUS.PENDING,
              factusBillId: billNumber,
              total: sale.total,
              taxTotal: sale.tax,
            },
          })

          // --- Descontar 1 crédito de facturación del saldo de la empresa ---
          // Este es el core del modelo de negocio: cada FE consume un crédito
          await prisma.company.update({
            where: { id: companyId },
            data: { factusCreditBalance: { decrement: 1 } },
          })

          // --- Registrar la transacción de consumo de crédito ---
          await prisma.factusCreditTransaction.create({
            data: {
              companyId,
              type: FACTUS_TRANSACTION_TYPE.CONSUMPTION,
              amount: 1,
              balanceAfter: (company.factusCreditBalance ?? 0) - 1,
              saleId: sale.id,
              notes: `FE ${billNumber}`,
            },
          })

          // --- Notificar si el saldo de créditos está bajo ---
          await notifyLowCredit(companyId, (company.factusCreditBalance ?? 0) - 1)

          // --- Auditar todo: consumo de crédito + creación de FE ---
          await logAudit({
            userId: session.user.id,
            companyId,
            action: AUDIT_ACTION.FACTUS_CREDITS_CONSUMED,
            entity: "Sale",
            entityId: sale.id,
            metadata: { billNumber, balanceAfter: (company.factusCreditBalance ?? 0) - 1 },
          })

          await logAudit({
            userId: session.user.id,
            companyId,
            action: AUDIT_ACTION.FACTUS_INVOICE_CREATED,
            entity: "ElectronicInvoice",
            entityId: sale.id,
            metadata: { billNumber, cufe: responseData.cufe || factusResponse.cufe },
          })

          electronicInvoiceResult = factusResponse
        }
      }
    } catch (error) {
      console.error("Error creating electronic invoice:", error)
    }
  }

  // --- Respuesta final: devolvemos la venta con los datos de la FE (si aplica) ---
  return NextResponse.json({ ...sale, electronicInvoice: electronicInvoiceResult }, { status: 201 })
}