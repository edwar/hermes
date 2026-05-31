import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"
import { createProductSchema, updateProductSchema } from "@/features/inventory/schemas/product-schema"

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
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({
    products,
    total,
    pages: Math.ceil(total / pageSize),
    page,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "No tienes permisos para crear productos" }, { status: 403 })
  }
  if (!session.user.companyId) {
    return NextResponse.json({ error: "No tienes una empresa asignada" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      companyId: session.user.companyId,
    },
  })
  return NextResponse.json(product, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "No tienes permisos para actualizar productos" }, { status: 403 })
  }

  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const parsed = updateProductSchema.safeParse(rest)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const product = await prisma.product.update({
    where: { id, ...companyScope(session) },
    data: parsed.data,
  })
  return NextResponse.json(product)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD") {
    return NextResponse.json({ error: "Solo administradores pueden eliminar productos" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await prisma.product.update({
    where: { id, ...companyScope(session) },
    data: { isActive: false },
  })
  return NextResponse.json({ success: true })
}
