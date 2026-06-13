import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"

function isAdminOrGod(role: string) {
  return role === "ADMIN" || role === "GOD"
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isAdminOrGod(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { name, isActive } = body

  const where = { id, ...companyScope(session) }
  const existing = await withPrismaRetry(
    () => prisma.cashRegister.findUnique({ where }),
    "cash-registers:lookup"
  )
  if (!existing) {
    return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 })
  }

  if (name && name.trim() !== existing.name) {
    const duplicate = await withPrismaRetry(
      () =>
        prisma.cashRegister.findFirst({
          where: { name: name.trim(), ...companyScope(session) },
        }),
      "cash-registers:duplicate-check"
    )
    if (duplicate) {
      return NextResponse.json({ error: "Ya existe una caja con ese nombre" }, { status: 400 })
    }
  }

  const register = await withPrismaRetry(
    () =>
      prisma.cashRegister.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(isActive !== undefined && { isActive }),
        },
      }),
    "cash-registers:update"
  )

  return NextResponse.json(register)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isAdminOrGod(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params

  const activeSessions = await withPrismaRetry(
    () =>
      prisma.cashSession.count({
        where: { cashRegisterId: id, status: "OPEN" },
      }),
    "cash-registers:active-sessions"
  )
  if (activeSessions > 0) {
    return NextResponse.json({ error: "No se puede eliminar una caja con sesiones activas" }, { status: 400 })
  }

  await withPrismaRetry(
    () => prisma.cashRegister.delete({ where: { id, ...companyScope(session) } }),
    "cash-registers:delete"
  )

  return NextResponse.json({ success: true })
}