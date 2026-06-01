import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPurchaseOrderSchema } from "@/features/purchase-orders/schemas/purchase-order-schema"
import { companyScope } from "@/lib/company-scope"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Solo administradores pueden ver pedidos" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")

  const where = {
    ...companyScope(session),
    ...(status ? { status: status as "PENDING" | "RECEIVED" | "CANCELLED" } : {}),
  }

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        user: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
  ])

  return NextResponse.json({ orders, total, page, pages: Math.ceil(total / pageSize) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "No autorizado para crear pedidos" }, { status: 403 })
  }
  if (!session.user.companyId) {
    return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = createPurchaseOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { supplierId, notes, items } = parsed.data

  const total = items.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0)

  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      notes,
      total,
      companyId: session.user.companyId,
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
  })

  return NextResponse.json(order, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "No autorizado para actualizar pedidos" }, { status: 403 })
  }

  const body = await req.json()
  const { id, status } = body

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const order = await prisma.purchaseOrder.update({
    where: { id, ...companyScope(session) },
    data: { status },
    include: {
      supplier: true,
      user: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
  })

  return NextResponse.json(order)
}
