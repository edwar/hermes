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
import { emitInvoiceForSale } from "@/lib/invoicing/emit"
import { STOCK_MOVEMENT_TYPE, USER_ROLE, SORT_DIRECTION } from "@/lib/constants"
import z from "zod"

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
  // PASO 3: FACTURA ELECTRÓNICA (FE) — INTEGRACIÓN CON EL PROVEEDOR (FACTUS + DIAN)
  // La venta y el inventario ya están guardados. La emisión vive en
  // lib/invoicing/emit.ts y es idempotente (reference_code estable por venta):
  //   - VALIDATED: la DIAN aceptó el documento; se descontó 1 crédito.
  //   - PENDING:   sin respuesta definitiva; se reintenta en segundo plano.
  //   - REJECTED:  la DIAN rechazó; hay que corregir datos y reintentar.
  //   - skipped:   no se intentó (FE deshabilitada, bloqueada o sin créditos).
  // Una falla de FE nunca revierte la venta.
  // ===========================================================================

  let electronicInvoiceResult = null

  if (requestElectronicInvoice) {
    try {
      electronicInvoiceResult = await emitInvoiceForSale(sale.id, companyId, session.user.id)
    } catch (error) {
      console.error("Error creating electronic invoice:", error)
      electronicInvoiceResult = { status: "error", reason: "No se pudo emitir la factura electrónica" }
    }
  }

  // --- Respuesta final: devolvemos la venta con los datos de la FE (si aplica) ---
  return NextResponse.json({ ...sale, electronicInvoice: electronicInvoiceResult }, { status: 201 })
}