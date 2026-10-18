import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { guardModule } from "@/lib/permissions/guard"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"
import { createProductSchema, updateProductSchema } from "@/features/inventory/schemas/product-schema"
import { SORT_DIRECTION } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const categoryId = searchParams.get("categoryId") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")
  const onlyLowStock = searchParams.get("onlyLowStock") === "true"

  const where = {
    ...companyScope(session),
    isActive: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { barcode: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(categoryId && { categoryId }),
    ...(onlyLowStock ? { stock: { lte: 5 } } : {}),
  }

  const [products, total] = await Promise.all([
    withPrismaRetry(
      () =>
        prisma.product.findMany({
          where,
          include: { category: true },
          orderBy: { createdAt: SORT_DIRECTION.DESC },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      "products:list"
    ),
    withPrismaRetry(
      () => prisma.product.count({ where }),
      "products:list-count"
    ),
  ])

  return NextResponse.json({
    products,
    total,
    pages: Math.ceil(total / pageSize),
    page,
  })
}

export async function POST(req: NextRequest) {
  const guard = await guardModule("/inventory")
  if ("error" in guard) return guard.error
  const { session } = guard
  if (!session.user.companyId) {
    return NextResponse.json({ error: "No tienes una empresa asignada" }, { status: 400 })
  }
  const companyId = session.user.companyId

  const body = await req.json()
  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const product = await withPrismaRetry(
    () =>
      prisma.product.create({
        data: {
          ...parsed.data,
          companyId,
        },
      }),
    "products:create"
  )
  return NextResponse.json(product, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const guard = await guardModule("/inventory")
  if ("error" in guard) return guard.error
  const { session } = guard

  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const parsed = updateProductSchema.safeParse(rest)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const product = await withPrismaRetry(
    () =>
      prisma.product.update({
        where: { id, ...companyScope(session) },
        data: parsed.data,
      }),
    "products:update"
  )
  return NextResponse.json(product)
}

export async function DELETE(req: NextRequest) {
  const guard = await guardModule("/inventory")
  if ("error" in guard) return guard.error
  const { session } = guard
  // Eliminar productos no está permitido al Gestor (regla fija, aunque pueda editarlos).
  if (session.user.role === "MANAGER") return NextResponse.json({ error: "No tienes permiso" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await withPrismaRetry(
    () =>
      prisma.product.update({
        where: { id, ...companyScope(session) },
        data: { isActive: false },
      }),
    "products:deactivate"
  )
  return NextResponse.json({ success: true })
}
