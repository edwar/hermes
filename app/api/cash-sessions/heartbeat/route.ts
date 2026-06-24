import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { CASH_SESSION_STATUS } from "@/lib/constants"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const { sessionId, deviceId } = body

    if (!sessionId || !deviceId) {
      return NextResponse.json({ error: "sessionId y deviceId son requeridos" }, { status: 400 })
    }

    const cashSession = await withPrismaRetry(
      () =>
        prisma.cashSession.findUnique({
          where: { id: sessionId },
          include: { user: { select: { id: true } } },
        }),
      "heartbeat:lookup"
    )

    if (!cashSession) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    if (cashSession.userId !== session.user.id) {
      return NextResponse.json({ error: "No tienes acceso a esta sesión" }, { status: 403 })
    }

    if (cashSession.status !== CASH_SESSION_STATUS.OPEN) {
      return NextResponse.json({ error: "La sesión ya está cerrada" }, { status: 400 })
    }

    const updated = await withPrismaRetry(
      () =>
        prisma.cashSession.update({
          where: { id: sessionId },
          data: {
            lastHeartbeat: new Date(),
            deviceId: deviceId,
          },
        }),
      "heartbeat:update"
    )

    return NextResponse.json({ success: true, lastHeartbeat: updated.lastHeartbeat })
  } catch (error: any) {
    if (
      error?.code === "P2024" ||
      error?.code === "P2028" ||
      error?.code === "P2034" ||
      error?.message?.includes("Can't reach database") ||
      error?.message?.includes("Timed out fetching a new connection") ||
      error?.message?.includes("server closed the connection")
    ) {
      console.warn("Heartbeat: base de datos no disponible, reintentando en el próximo ciclo")
      return NextResponse.json({ success: false, error: "Base de datos no disponible" }, { status: 503 })
    }
    console.error("Heartbeat error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}