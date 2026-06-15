import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { logAudit } from "@/lib/audit"
import { z } from "zod"

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "CASHIER"]),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (session.user.role === "GOD") {
    const users = await withPrismaRetry(
      () =>
        prisma.user.findMany({
          where: { role: { not: "GOD" } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
            company: { select: { id: true, name: true } },
          },
        }),
      "users:list-god"
    )
    return NextResponse.json(users)
  }

  if (session.user.role === "OWNER" || session.user.role === "ADMIN") {
    const users = await withPrismaRetry(
      () =>
        prisma.user.findMany({
          where: { companyId: session.user.companyId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
          },
        }),
      "users:list-admin"
    )
    return NextResponse.json(users)
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 401 })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (session.user.role !== "GOD" && session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (session.user.role === "ADMIN" && (parsed.data.role === "OWNER" || parsed.data.role === "ADMIN")) {
    return NextResponse.json({ error: "No tienes permiso para crear usuarios OWNER o ADMIN" }, { status: 403 })
  }

  const existing = await withPrismaRetry(
    () =>
      prisma.user.findFirst({
        where: { email: parsed.data.email, companyId: session.user.companyId ?? null },
      }),
    "users:email-exists-check"
  )
  if (existing) {
    return NextResponse.json({ error: "El email ya está registrado en esta empresa" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const { password: _, ...userData } = parsed.data
  const user = await withPrismaRetry(
    () =>
      prisma.user.create({
        data: {
          ...userData,
          passwordHash,
          companyId: session.user.companyId ?? undefined,
        },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      }),
    "users:create"
  )

  await logAudit({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: "USER_CREATED",
    entity: "User",
    entityId: user.id,
    metadata: { role: user.role },
    req,
  })

  return NextResponse.json(user, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (session.user.role !== "GOD" && session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { id, ...data } = body

  if (session.user.role === "ADMIN") {
    if (data.role === "OWNER" || data.role === "ADMIN") {
      return NextResponse.json({ error: "No tienes permiso para asignar rol OWNER o ADMIN" }, { status: 403 })
    }
  }

  const existingUser = await withPrismaRetry(
    () => prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } }),
    "users:fetch-existing"
  )

  if (!existingUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {}
  if (data.name) updateData.name = data.name
  if (data.role) updateData.role = data.role
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12)

  const user = await withPrismaRetry(
    () =>
      prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      }),
    "users:update"
  )

  if (data.role && data.role !== existingUser.role) {
    await logAudit({
      userId: session.user.id, companyId: session.user.companyId, action: "USER_ROLE_CHANGED",
      entity: "User", entityId: user.id, metadata: { from: existingUser.role, to: data.role }, req,
    })
  }

  if (data.password) {
    await logAudit({
      userId: session.user.id, companyId: session.user.companyId, action: "USER_PASSWORD_RESET",
      entity: "User", entityId: user.id, req,
    })
  }

  if (data.isActive !== undefined && !data.isActive && existingUser.isActive) {
    await logAudit({
      userId: session.user.id, companyId: session.user.companyId, action: "USER_DEACTIVATED",
      entity: "User", entityId: user.id, req,
    })
  }

  if (data.isActive !== undefined && data.isActive && !existingUser.isActive) {
    await logAudit({
      userId: session.user.id, companyId: session.user.companyId, action: "USER_REACTIVATED",
      entity: "User", entityId: user.id, req,
    })
  }

  const changedFields: Record<string, unknown> = {}
  if (data.name) changedFields.name = data.name
  if (data.role) changedFields.role = data.role
  if (data.isActive !== undefined) changedFields.isActive = data.isActive
  await logAudit({
    userId: session.user.id, companyId: session.user.companyId, action: "USER_UPDATED",
    entity: "User", entityId: user.id, metadata: changedFields, req,
  })

  return NextResponse.json(user)
}