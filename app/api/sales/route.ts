import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createSaleSchema } from "@/features/pos/schemas/sale-schema"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""

  let where: Record<string, unknown> = {}

  if (session.user.role === "GOD") {
  } else if (session.user.companyId) {
    where.companyId = session.user.companyId
  } else {
    return NextResponse.json({ sales: [], total: 0, pages: 0, page: 1 })
  }

  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from)
    if (to) (where.createdAt as Record<string, Date>).lte = new Date(to + "T23:59:59.999Z")
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { items: { include: { product: true } }, user: true, customer: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sale.count({ where }),
  ])

  return NextResponse.json({ sales, total, pages: Math.ceil(total / pageSize), page })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (!session.user.companyId) {
    return NextResponse.json({ error: "Usuario sin empresa asignada" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = createSaleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { items, subtotal, tax, discount, total, paymentMethod, sessionId, customerId, notes, localId, requestElectronicInvoice } = parsed.data
  const companyId = session.user.companyId

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
          reason: `Venta #${localId ?? "directa"}`,
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
          })),
        },
      },
      include: { items: { include: { product: true } }, user: true, customer: true },
    })
  })

  return NextResponse.json(sale, { status: 201 })
}