import { NextRequest, NextResponse } from "next/server"
import { guardModule } from "@/lib/permissions/guard"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { createSupplierSchema, updateSupplierSchema } from "@/features/suppliers/schemas/supplier-schema"
import { companyScope } from "@/lib/company-scope"
import { SORT_DIRECTION } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const guard = await guardModule(["/suppliers", "/purchase-orders"])
  if ("error" in guard) return guard.error
  const { session } = guard

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
    withPrismaRetry(
      () =>
        prisma.supplier.findMany({
          where,
          orderBy: { createdAt: SORT_DIRECTION.DESC },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      "suppliers:list"
    ),
    withPrismaRetry(
      () => prisma.supplier.count({ where }),
      "suppliers:list-count"
    ),
  ])

  return NextResponse.json({ suppliers, total, page, pages: Math.ceil(total / pageSize) })
}

export async function POST(req: NextRequest) {
  const guard = await guardModule("/suppliers")
  if ("error" in guard) return guard.error
  const { session } = guard

  const companyId = session.user.companyId
  if (!companyId) {
    return NextResponse.json({ error: "No tienes una empresa asignada" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = createSupplierSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supplier = await withPrismaRetry(
    () =>
      prisma.supplier.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          address: parsed.data.address || null,
          companyId,
        },
      }),
    "suppliers:create"
  )
  return NextResponse.json(supplier, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const guard = await guardModule("/suppliers")
  if ("error" in guard) return guard.error
  const { session } = guard

  const body = await req.json()
  const parsed = updateSupplierSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id, ...data } = parsed.data
  const supplier = await withPrismaRetry(
    () =>
      prisma.supplier.update({
        where: { id, ...companyScope(session) },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email !== undefined && { email: data.email || null }),
          ...(data.phone !== undefined && { phone: data.phone || null }),
          ...(data.address !== undefined && { address: data.address || null }),
        },
      }),
    "suppliers:update"
  )
  return NextResponse.json(supplier)
}

export async function DELETE(req: NextRequest) {
  const guard = await guardModule("/suppliers")
  if ("error" in guard) return guard.error
  const { session } = guard

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await withPrismaRetry(
    () =>
      prisma.supplier.update({
        where: { id, ...companyScope(session) },
        data: { isActive: false },
      }),
    "suppliers:deactivate"
  )
  return NextResponse.json({ success: true })
}
