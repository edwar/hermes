import { NextRequest, NextResponse } from "next/server"
import { guardModule } from "@/lib/permissions/guard"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { createPurchaseOrderSchema } from "@/features/purchase-orders/schemas/purchase-order-schema"
import { companyScope } from "@/lib/company-scope"
import { SORT_DIRECTION, PO_STATUS } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const guard = await guardModule("/purchase-orders")
  if ("error" in guard) return guard.error
  const { session } = guard

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")

  const where = {
    ...companyScope(session),
    ...(status ? { status: status as (typeof PO_STATUS)[keyof typeof PO_STATUS] } : {}),
  }

  const [orders, total] = await Promise.all([
    withPrismaRetry(
      () =>
        prisma.purchaseOrder.findMany({
          where,
          include: {
            supplier: true,
            user: { select: { id: true, name: true } },
            items: { include: { product: true } },
          },
          orderBy: { createdAt: SORT_DIRECTION.DESC },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      "purchase-orders:list"
    ),
    withPrismaRetry(
      () => prisma.purchaseOrder.count({ where }),
      "purchase-orders:list-count"
    ),
  ])

  return NextResponse.json({ orders, total, page, pages: Math.ceil(total / pageSize) })
}

export async function POST(req: NextRequest) {
  const guard = await guardModule("/purchase-orders")
  if ("error" in guard) return guard.error
  const { session } = guard
  if (!session.user.companyId) {
    return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })
  }
  const companyId = session.user.companyId

  const body = await req.json()
  const parsed = createPurchaseOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { supplierId, notes, items } = parsed.data

  const total = items.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0)

  const order = await withPrismaRetry(
    () =>
      prisma.purchaseOrder.create({
        data: {
          supplierId,
          notes,
          total,
          companyId,
          userId: session.user.id,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              purchasePrice: item.purchasePrice,
            })),
          },
        },
        include: {
          supplier: true,
          user: { select: { id: true, name: true } },
          items: { include: { product: true } },
        },
      }),
    "purchase-orders:create"
  )

  return NextResponse.json(order, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const guard = await guardModule("/purchase-orders")
  if ("error" in guard) return guard.error
  const { session } = guard

  const body = await req.json()
  const { id, status } = body

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const order = await withPrismaRetry(
    () =>
      prisma.purchaseOrder.update({
        where: { id, ...companyScope(session) },
        data: { status },
        include: {
          supplier: true,
          user: { select: { id: true, name: true } },
          items: { include: { product: true } },
        },
      }),
    "purchase-orders:update"
  )

  return NextResponse.json(order)
}
