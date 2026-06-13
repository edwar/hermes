import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const companyId = session.user.companyId
  if (!companyId) return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })

  const denominations = await withPrismaRetry(
    () =>
      prisma.cashDenomination.findMany({
        where: { companyId },
        orderBy: { sortOrder: "asc" },
      }),
    "cash-denominations:list"
  )
  return NextResponse.json(denominations)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const role = session.user.role
  if (role !== "GOD" && role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const companyId = session.user.companyId
  if (!companyId) return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })

  const body = await req.json()
  const { value, label } = body
  if (value == null || !label) return NextResponse.json({ error: "value y label son requeridos" }, { status: 400 })

  const maxOrder = await withPrismaRetry(
    () =>
      prisma.cashDenomination.findFirst({
        where: { companyId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      }),
    "cash-denominations:max-order"
  )

  const denomination = await withPrismaRetry(
    () =>
      prisma.cashDenomination.create({
        data: {
          value,
          label,
          sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
          companyId,
        },
      }),
    "cash-denominations:create"
  )

  return NextResponse.json(denomination, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const role = session.user.role
  if (role !== "GOD" && role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const companyId = session.user.companyId
  if (!companyId) return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })

  const body = await req.json()
  const { id, value, label, sortOrder, isActive } = body
  if (!id) return NextResponse.json({ error: "id es requerido" }, { status: 400 })

  const denomination = await withPrismaRetry(
    () =>
      prisma.cashDenomination.update({
        where: { id, companyId },
        data: { value, label, sortOrder, isActive },
      }),
    "cash-denominations:update"
  )

  return NextResponse.json(denomination)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const role = session.user.role
  if (role !== "GOD" && role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const companyId = session.user.companyId
  if (!companyId) return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id es requerido" }, { status: 400 })

  await withPrismaRetry(
    () => prisma.cashDenomination.delete({ where: { id, companyId } }),
    "cash-denominations:delete"
  )

  return NextResponse.json({ success: true })
}
