import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { denyUnlessModule } from "@/lib/api-access"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { createStockMovementSchema } from "@/features/inventory/schemas/stock-movement-schema"
import { companyScope } from "@/lib/company-scope"
import { SORT_DIRECTION } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const denied = denyUnlessModule(session, "/stock-movements")
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const productId = searchParams.get("productId") ?? ""
  const type = searchParams.get("type") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50")

  const where = {
    ...companyScope(session),
    ...(productId && { productId }),
    ...(type && { type }),
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: { product: { select: { id: true, name: true } } },
      orderBy: { createdAt: SORT_DIRECTION.DESC },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockMovement.count({ where }),
  ])

  return NextResponse.json({ movements, total, pages: Math.ceil(total / pageSize), page })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const denied = denyUnlessModule(session, "/stock-movements")
  if (denied) return denied

  const body = await req.json()
  const parsed = createStockMovementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { type, quantity, reason, productId } = parsed.data
  const companyId = session.user.companyId!

  const product = await prisma.product.findUnique({ where: { id: productId, companyId } })
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
  }

  const newStock = type === "IN"
    ? product.stock + quantity
    : product.stock - quantity

  if (newStock < 0) {
    return NextResponse.json({ error: "Stock insuficiente para esta salida" }, { status: 400 })
  }

  await withPrismaRetry(
    () => prisma.product.update({ where: { id: productId }, data: { stock: newStock } }),
    "stock-movement:update-product"
  )

  const movement = await withPrismaRetry(
    () =>
      prisma.stockMovement.create({
        data: { type, quantity, reason, productId, companyId },
        include: { product: { select: { id: true, name: true } } },
      }),
    "stock-movement:create"
  )

  return NextResponse.json(movement, { status: 201 })
}