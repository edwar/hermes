import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { SORT_DIRECTION } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get("unread") === "true"
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = 20

  const where: Record<string, unknown> = { userId: session.user.id }
  if (unreadOnly) where.readAt = null

  const [notifications, total, unreadCount] = await Promise.all([
    withPrismaRetry(
      () =>
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: SORT_DIRECTION.DESC },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      "notifications:list"
    ),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ])

  return NextResponse.json({
    notifications,
    total,
    unread: unreadCount,
    pages: Math.ceil(total / pageSize),
    page,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { action } = body

  if (action === "read-all") {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
}
