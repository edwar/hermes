import { NextRequest, NextResponse } from "next/server"
import { guardModule } from "@/lib/permissions/guard"
import { canAssignRole, canManageUser, selfChangeError } from "@/lib/permissions/user-management"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { logAudit } from "@/lib/audit"
import { USER_ROLE, AUDIT_ACTION, SORT_DIRECTION } from "@/lib/constants"
import { z } from "zod"

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum([USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER, USER_ROLE.CASHIER]),
})

export async function GET() {
  const guard = await guardModule("/users")
  if ("error" in guard) return guard.error
  const { session } = guard

  if (session.user.role === USER_ROLE.GOD) {
    const users = await withPrismaRetry(
      () =>
        prisma.user.findMany({
          where: { role: { not: USER_ROLE.GOD } },
          orderBy: { createdAt: SORT_DIRECTION.DESC },
          select: {
            id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
            company: { select: { id: true, name: true } },
          },
        }),
      "users:list-god"
    )
    return NextResponse.json(users)
  }

  {
    const users = await withPrismaRetry(
      () =>
        prisma.user.findMany({
          where: { companyId: session.user.companyId },
          orderBy: { createdAt: SORT_DIRECTION.DESC },
          select: {
            id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
          },
        }),
      "users:list-admin"
    )
    return NextResponse.json(users)
  }
}

export async function POST(req: NextRequest) {
  const guard = await guardModule("/users")
  if ("error" in guard) return guard.error
  const { session } = guard

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (!canAssignRole(session.user.role, parsed.data.role)) {
    return NextResponse.json({ error: "No tienes permiso para crear usuarios con ese rol" }, { status: 403 })
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
    action: AUDIT_ACTION.USER_CREATED,
    entity: "User",
    entityId: user.id,
    metadata: { role: user.role },
    req,
  })

  return NextResponse.json(user, { status: 201 })
}

const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  role: z.enum([USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER, USER_ROLE.CASHIER]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
})

export async function PUT(req: NextRequest) {
  const guard = await guardModule("/users")
  if ("error" in guard) return guard.error
  const { session } = guard

  const parsed = updateUserSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { id, ...data } = parsed.data

  // Fuera de la plataforma solo se editan usuarios de la propia empresa; si no, es como si no existieran.
  const existingUser = await withPrismaRetry(
    () =>
      prisma.user.findFirst({
        where: { id, ...(session.user.role === USER_ROLE.GOD ? {} : { companyId: session.user.companyId ?? "" }) },
        select: { id: true, role: true, isActive: true },
      }),
    "users:fetch-existing"
  )

  if (!existingUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (!canManageUser({ id: session.user.id, role: session.user.role }, existingUser)) {
    return NextResponse.json({ error: "No tienes permiso para modificar a este usuario" }, { status: 403 })
  }
  if (data.role !== undefined && data.role !== existingUser.role && !canAssignRole(session.user.role, data.role)) {
    return NextResponse.json({ error: "No tienes permiso para asignar ese rol" }, { status: 403 })
  }
  const selfError = selfChangeError(session.user.id, id, data, existingUser.role)
  if (selfError) return NextResponse.json({ error: selfError }, { status: 403 })

  const updateData: Record<string, unknown> = {}
  if (data.name) updateData.name = data.name
  if (data.role) updateData.role = data.role
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12)

  const user = await withPrismaRetry(
    () =>
      prisma.user.update({
        where: { id: existingUser.id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      }),
    "users:update"
  )

  if (data.role && data.role !== existingUser.role) {
    await logAudit({
      userId: session.user.id, companyId: session.user.companyId,     action: AUDIT_ACTION.USER_ROLE_CHANGED,
      entity: "User", entityId: user.id, metadata: { from: existingUser.role, to: data.role }, req,
    })
  }

  if (data.password) {
    await logAudit({
      userId: session.user.id, companyId: session.user.companyId,     action: AUDIT_ACTION.USER_PASSWORD_RESET,
      entity: "User", entityId: user.id, req,
    })
  }

  if (data.isActive !== undefined && !data.isActive && existingUser.isActive) {
    await logAudit({
      userId: session.user.id, companyId: session.user.companyId,     action: AUDIT_ACTION.USER_DEACTIVATED,
      entity: "User", entityId: user.id, req,
    })
  }

  if (data.isActive !== undefined && data.isActive && !existingUser.isActive) {
    await logAudit({
      userId: session.user.id, companyId: session.user.companyId,     action: AUDIT_ACTION.USER_REACTIVATED,
      entity: "User", entityId: user.id, req,
    })
  }

  const changedFields: Record<string, unknown> = {}
  if (data.name) changedFields.name = data.name
  if (data.role) changedFields.role = data.role
  if (data.isActive !== undefined) changedFields.isActive = data.isActive
  await logAudit({
    userId: session.user.id, companyId: session.user.companyId,     action: AUDIT_ACTION.USER_UPDATED,
    entity: "User", entityId: user.id, metadata: changedFields, req,
  })

  return NextResponse.json(user)
}