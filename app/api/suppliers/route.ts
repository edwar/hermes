import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createSupplierSchema, updateSupplierSchema } from "@/features/suppliers/schemas/supplier-schema"
import { companyScope } from "@/lib/company-scope"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "No autorizado para ver proveedores" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const includeInactive = searchParams.get("includeInactive") === "true"
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")

  const where = {
    ...companyScope(session),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
    ...(includeInactive ? {} : { isActive: true }),
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplier.count({ where }),
  ])

  return NextResponse.json({ suppliers, total, page, pages: Math.ceil(total / pageSize) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD") {
    return NextResponse.json({ error: "Solo administradores pueden crear proveedores" }, { status: 403 })
  }

  const companyId = session.user.companyId
  if (!companyId) {
    return NextResponse.json({ error: "No tienes una empresa asignada" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = createSupplierSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      companyId,
    },
  })
  return NextResponse.json(supplier, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD") {
    return NextResponse.json({ error: "Solo administradores pueden actualizar proveedores" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSupplierSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id, ...data } = parsed.data
  const supplier = await prisma.supplier.update({
    where: { id, ...companyScope(session) },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.address !== undefined && { address: data.address || null }),
    },
  })
  return NextResponse.json(supplier)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD") {
    return NextResponse.json({ error: "Solo administradores pueden eliminar proveedores" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await prisma.supplier.update({
    where: { id, ...companyScope(session) },
    data: { isActive: false },
  })
  return NextResponse.json({ success: true })
}
