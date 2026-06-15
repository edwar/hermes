import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "GOD") return NextResponse.json({ error: "Solo GOD puede ver empresas" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""

  const companies = await withPrismaRetry(
    () =>
      prisma.company.findMany({
        where: search ? { name: { contains: search, mode: "insensitive" } } : {},
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, nit: true, address: true, phone: true, email: true,
          isActive: true, createdAt: true, updatedAt: true,
          factusEnabled: true, factusCreditBalance: true, factusCreditTotal: true, factusBlocked: true,
          _count: { select: { users: true } },
        },
      }),
    "companies:list"
  )

  return NextResponse.json(companies)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "GOD") return NextResponse.json({ error: "Solo GOD puede editar empresas" }, { status: 403 })

  const body = await req.json()
  const { id, name, nit, address, phone, email, isActive, factusBlocked } = body

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const updateData: Record<string, unknown> = { name, nit, address, phone, email, isActive }
  if (typeof factusBlocked === "boolean") updateData.factusBlocked = factusBlocked

  const company = await withPrismaRetry(
    () =>
      prisma.company.update({
        where: { id },
        data: updateData,
      }),
    "companies:update"
  )

  return NextResponse.json(company)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "GOD") return NextResponse.json({ error: "Solo GOD puede eliminar empresas" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await withPrismaRetry(
    () => prisma.company.update({ where: { id }, data: { isActive: false } }),
    "companies:deactivate"
  )

  return NextResponse.json({ message: "Empresa desactivada" })
}
