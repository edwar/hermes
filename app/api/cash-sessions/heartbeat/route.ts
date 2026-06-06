import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const HEARTBEAT_TIMEOUT_MS = 60 * 1000

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { sessionId, deviceId } = body

  if (!sessionId || !deviceId) {
    return NextResponse.json({ error: "sessionId y deviceId son requeridos" }, { status: 400 })
  }

  const cashSession = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true } } },
  })

  if (!cashSession) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  }

  if (cashSession.userId !== session.user.id) {
    return NextResponse.json({ error: "No tienes acceso a esta sesión" }, { status: 403 })
  }

  if (cashSession.status !== "OPEN") {
    return NextResponse.json({ error: "La sesión ya está cerrada" }, { status: 400 })
  }

  // Actualizar el heartbeat
  const updated = await prisma.cashSession.update({
    where: { id: sessionId },
    data: {
      lastHeartbeat: new Date(),
      deviceId: deviceId // Actualizar deviceId en caso de que haya cambiado
    },
  })

  return NextResponse.json({ success: true, lastHeartbeat: updated.lastHeartbeat })
}