import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const user = await withPrismaRetry(
    () =>
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { sales: true } },
        },
      }),
    "profile:user-lookup"
  )

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const salesToday = await withPrismaRetry(
    () =>
      prisma.sale.count({
        where: { userId: session.user.id, createdAt: { gte: today } },
      }),
    "profile:sales-today-count"
  )

  return NextResponse.json({ ...user, salesToday })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { name, currentPassword, newPassword } = body

  const updateData: Record<string, unknown> = {}

  if (name !== undefined) {
    if (!name.trim()) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 })
    }
    updateData.name = name.trim()
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Debes ingresar tu contraseña actual" }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 })
    }

    const user = await withPrismaRetry(
      () => prisma.user.findUnique({ where: { id: session.user.id } }),
      "profile:password-verify-lookup"
    )
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 })
    }

    updateData.passwordHash = await bcrypt.hash(newPassword, 12)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No hay datos para actualizar" }, { status: 400 })
  }

  const updated = await withPrismaRetry(
    () =>
      prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true },
      }),
    "profile:update"
  )

  return NextResponse.json(updated)
}
