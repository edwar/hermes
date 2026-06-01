import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER"]),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (session.user.role === "GOD") {
    const users = await prisma.user.findMany({
      where: { role: { not: "GOD" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        company: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(users)
  }

  if (session.user.role === "ADMIN") {
    const users = await prisma.user.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
      },
    })
    return NextResponse.json(users)
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 401 })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (session.user.role !== "GOD" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (session.user.role === "ADMIN" && parsed.data.role === "ADMIN") {
    return NextResponse.json({ error: "No tienes permiso para crear usuarios ADMIN" }, { status: 403 })
  }

  const existing = await prisma.user.findFirst({
    where: { email: parsed.data.email, companyId: session.user.companyId ?? null },
  })
  if (existing) {
    return NextResponse.json({ error: "El email ya está registrado en esta empresa" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const user = await prisma.user.create({
    data: {
      ...parsed.data,
      passwordHash,
      companyId: session.user.companyId ?? undefined,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (session.user.role !== "GOD" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { id, ...data } = body

  if (session.user.role === "ADMIN") {
    if (data.role === "ADMIN") {
      return NextResponse.json({ error: "No tienes permiso para asignar rol ADMIN" }, { status: 403 })
    }
  }

  const updateData: Record<string, unknown> = {}
  if (data.name) updateData.name = data.name
  if (data.role) updateData.role = data.role
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12)

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })
  return NextResponse.json(user)
}