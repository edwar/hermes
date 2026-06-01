import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"

const HEARTBEAT_TIMEOUT_MS = 60 * 1000 // 60 seconds without heartbeat = session dead

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")
  const status = searchParams.get("status") ?? ""
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""

  const scope = companyScope(session)
  const where: Record<string, unknown> = {
    ...(scope.companyId ? { cashRegister: { companyId: scope.companyId } } : {}),
  }
  if (status) where.status = status
  if (from) where.openedAt = { ...(where.openedAt as Record<string, unknown> || {}), gte: new Date(from) }
  if (to) where.openedAt = { ...(where.openedAt as Record<string, unknown> || {}), lte: new Date(to + "T23:59:59.999Z") }

  const [sessions, total] = await Promise.all([
    prisma.cashSession.findMany({
      where,
      include: {
        cashRegister: true,
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { sales: true } },
      },
      orderBy: { openedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cashSession.count({ where }),
  ])

  return NextResponse.json({ sessions, total, pages: Math.ceil(total / pageSize), page })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { cashRegisterId, openingBalance, deviceId, deviceName } = body

  if (!cashRegisterId) {
    return NextResponse.json({ error: "Debes seleccionar una caja" }, { status: 400 })
  }

  if (openingBalance === undefined || openingBalance < 0) {
    return NextResponse.json({ error: "La base inicial es requerida y debe ser mayor o igual a 0" }, { status: 400 })
  }

  const scope = companyScope(session)
  const registerWhere = { id: cashRegisterId, ...scope, isActive: true }
  const register = await prisma.cashRegister.findUnique({ where: registerWhere })
  if (!register) {
    return NextResponse.json({ error: "Caja no encontrada o inactiva" }, { status: 400 })
  }

  // Check if user already has an open session (maybe on another device)
  const userActiveSession = await prisma.cashSession.findFirst({
    where: { userId: session.user.id, status: "OPEN" },
  })
  
  if (userActiveSession) {
    // Check if the session has a heartbeat timeout (device dead)
    const hasTimedOut = userActiveSession.lastHeartbeat && 
      (Date.now() - new Date(userActiveSession.lastHeartbeat).getTime()) > HEARTBEAT_TIMEOUT_MS

    if (!hasTimedOut && userActiveSession.deviceId !== deviceId) {
      // Same user, different device - check if the device is different
      return NextResponse.json({ 
        error: "Ya tienes una sesión abierta en otro dispositivo. Ciérrala antes de abrir otra.",
        activeSessionId: userActiveSession.id,
        activeDevice: userActiveSession.deviceName
      }, { status: 409 })
    }
    
    // Session is stale (no heartbeat), close it
    if (hasTimedOut) {
      await prisma.cashSession.update({
        where: { id: userActiveSession.id },
        data: { status: "CLOSED", closedAt: new Date(), notes: "Sesión cerrada por inactividad" }
      })
    }
  }

  // Check if cash register already has an open session
  const registerActiveSession = await prisma.cashSession.findFirst({
    where: { cashRegisterId, status: "OPEN" },
    include: { user: { select: { name: true, email: true } } }
  })

  if (registerActiveSession) {
    // Check if the session is stale (no heartbeat from that device)
    const hasTimedOut = registerActiveSession.lastHeartbeat && 
      (Date.now() - new Date(registerActiveSession.lastHeartbeat).getTime()) > HEARTBEAT_TIMEOUT_MS

    if (hasTimedOut) {
      // Close stale session
      await prisma.cashSession.update({
        where: { id: registerActiveSession.id },
        data: { status: "CLOSED", closedAt: new Date(), notes: "Sesión cerrada por inactividad" }
      })
    } else if (registerActiveSession.userId !== session.user.id) {
      // Someone else has this register open
      return NextResponse.json({ 
        error: `Esta caja ya está abierta por ${registerActiveSession.user.name}`,
        activeSessionId: registerActiveSession.id,
        activeUser: registerActiveSession.user.name
      }, { status: 409 })
    } else if (registerActiveSession.deviceId !== deviceId) {
      // Same user but different device trying to open the same register
      return NextResponse.json({ 
        error: "Ya tienes esta caja abierta en otro dispositivo",
        activeSessionId: registerActiveSession.id,
        activeDevice: registerActiveSession.deviceName
      }, { status: 409 })
    }
  }

  const cashSession = await prisma.cashSession.create({
    data: {
      openingBalance,
      cashRegisterId,
      userId: session.user.id,
      deviceId,
      deviceName,
      lastHeartbeat: new Date(),
    },
    include: {
      cashRegister: true,
      user: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(cashSession, { status: 201 })
}