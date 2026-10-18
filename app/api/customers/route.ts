import { NextRequest, NextResponse } from "next/server"
import { guardModule } from "@/lib/permissions/guard"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { createCustomerSchema, updateCustomerSchema } from "@/features/inventory/schemas/customer-schema"
import { companyScope } from "@/lib/company-scope"
import { SORT_DIRECTION } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const guard = await guardModule("/customers")
  if ("error" in guard) return guard.error
  const { session } = guard

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")

  const where = {
    ...companyScope(session),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
        { cedula: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  }

  const [customers, total] = await Promise.all([
    withPrismaRetry(
      () =>
        prisma.customer.findMany({
          where,
          orderBy: { createdAt: SORT_DIRECTION.DESC },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      "customers:list"
    ),
    withPrismaRetry(
      () => prisma.customer.count({ where }),
      "customers:list-count"
    ),
  ])

  return NextResponse.json({ customers, total, pages: Math.ceil(total / pageSize), page })
}

export async function POST(req: NextRequest) {
  const guard = await guardModule("/customers")
  if ("error" in guard) return guard.error
  const { session } = guard
  if (!session.user.companyId) {
    return NextResponse.json({ error: "No tienes una empresa asignada" }, { status: 400 })
  }
  const companyId = session.user.companyId

  const body = await req.json()
  const parsed = createCustomerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const customer = await withPrismaRetry(
    () =>
      prisma.customer.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          address: parsed.data.address || null,
          cedula: parsed.data.cedula || null,
          companyId,
        },
      }),
    "customers:create"
  )
  return NextResponse.json(customer, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const guard = await guardModule("/customers")
  if ("error" in guard) return guard.error
  const { session } = guard

  const body = await req.json()
  const parsed = updateCustomerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id, ...data } = parsed.data
  const customer = await withPrismaRetry(
    () =>
      prisma.customer.update({
        where: { id, ...companyScope(session) },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email !== undefined && { email: data.email || null }),
          ...(data.phone !== undefined && { phone: data.phone || null }),
          ...(data.address !== undefined && { address: data.address || null }),
          ...(data.cedula !== undefined && { cedula: data.cedula || null }),
        },
      }),
    "customers:update"
  )
  return NextResponse.json(customer)
}

export async function DELETE(req: NextRequest) {
  const guard = await guardModule("/customers")
  if ("error" in guard) return guard.error
  const { session } = guard

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await withPrismaRetry(
    () => prisma.customer.delete({ where: { id, ...companyScope(session) } }),
    "customers:delete"
  )
  return NextResponse.json({ success: true })
}