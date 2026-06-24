import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { SORT_DIRECTION } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "GOD") return NextResponse.json({ error: "Solo GOD puede ver el audit log" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const action = searchParams.get("action")
  const entity = searchParams.get("entity")
  const entityId = searchParams.get("entityId")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = 30

  const where: Record<string, unknown> = {}
  if (userId) where.userId = userId
  if (action) where.action = action
  if (entity) where.entity = entity
  if (entityId) where.entityId = entityId
  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59.999Z")
  }

  const [logs, total] = await Promise.all([
    withPrismaRetry(
      () =>
        prisma.auditLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } },
            company: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: SORT_DIRECTION.DESC },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      "audit-log:list"
    ),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({
    logs,
    total,
    pages: Math.ceil(total / pageSize),
    page,
  })
}
