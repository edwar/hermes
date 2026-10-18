import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { denyUnlessModule } from "@/lib/api-access"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"
import { CASH_SESSION_STATUS, SORT_DIRECTION } from "@/lib/constants"

const HEARTBEAT_TIMEOUT_MS = 60 * 1000 // 60 segundos sin heartbeat = sesión muerta

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const denied = denyUnlessModule(session, "/cajas")
  if (denied) return denied

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
    withPrismaRetry(
      () =>
        prisma.cashSession.findMany({
          where,
          include: {
            cashRegister: true,
            user: { select: { id: true, name: true, email: true } },
            _count: { select: { sales: true } },
          },
          orderBy: { openedAt: SORT_DIRECTION.DESC },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      "cash-sessions:list"
    ),
    withPrismaRetry(
      () => prisma.cashSession.count({ where }),
      "cash-sessions:list-count"
    ),
  ])

  return NextResponse.json({ sessions, total, pages: Math.ceil(total / pageSize), page })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const denied = denyUnlessModule(session, "/pos")
  if (denied) return denied

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
  const register = await withPrismaRetry(
    () => prisma.cashRegister.findUnique({ where: registerWhere }),
    "cash-sessions:register-lookup"
  )
  if (!register) {
    return NextResponse.json({ error: "Caja no encontrada o inactiva" }, { status: 400 })
  }

  // Verificar si el usuario ya tiene una sesión abierta (quizás en otro dispositivo)
  const userActiveSession = await withPrismaRetry(
    () =>
      prisma.cashSession.findFirst({
        where: { userId: session.user.id, status: CASH_SESSION_STATUS.OPEN },
      }),
    "cash-sessions:user-active-lookup"
  )

  if (userActiveSession) {
    // Verificar si la sesión excedió el timeout de heartbeat (dispositivo muerto)
    const hasTimedOut = userActiveSession.lastHeartbeat &&
      (Date.now() - new Date(userActiveSession.lastHeartbeat).getTime()) > HEARTBEAT_TIMEOUT_MS

    if (!hasTimedOut && userActiveSession.deviceId !== deviceId) {
      // Mismo usuario, distinto dispositivo: bloquear apertura
      return NextResponse.json({
        error: "Ya tienes una sesión abierta en otro dispositivo. Ciérrala antes de abrir otra.",
        activeSessionId: userActiveSession.id,
        activeDevice: userActiveSession.deviceName
      }, { status: 409 })
    }

    // La sesión es obsoleta (sin heartbeat): cerrarla automáticamente
    if (hasTimedOut) {
      await withPrismaRetry(
        () =>
          prisma.cashSession.update({
            where: { id: userActiveSession.id },
            data: { status: "CLOSED", closedAt: new Date(), notes: "Sesión cerrada por inactividad" }
          }),
        "cash-sessions:auto-close-stale"
      )
    }
  }

  // Verificar si la caja ya tiene una sesión abierta
  const registerActiveSession = await withPrismaRetry(
    () =>
      prisma.cashSession.findFirst({
        where: { cashRegisterId, status: CASH_SESSION_STATUS.OPEN },
        include: { user: { select: { name: true, email: true } } }
      }),
    "cash-sessions:register-active-lookup"
  )

  if (registerActiveSession) {
    // Verificar si la sesión es obsoleta (sin heartbeat de ese dispositivo)
    const hasTimedOut = registerActiveSession.lastHeartbeat &&
      (Date.now() - new Date(registerActiveSession.lastHeartbeat).getTime()) > HEARTBEAT_TIMEOUT_MS

    if (hasTimedOut) {
      // Cerrar la sesión obsoleta
      await withPrismaRetry(
        () =>
          prisma.cashSession.update({
            where: { id: registerActiveSession.id },
            data: { status: CASH_SESSION_STATUS.CLOSED, closedAt: new Date(), notes: "Sesión cerrada por inactividad" }
          }),
        "cash-sessions:auto-close-stale-2"
      )
    } else if (registerActiveSession.userId !== session.user.id) {
      // Otro usuario tiene esta caja abierta
      return NextResponse.json({
        error: `Esta caja ya está abierta por ${registerActiveSession.user.name}`,
        activeSessionId: registerActiveSession.id,
        activeUser: registerActiveSession.user.name
      }, { status: 409 })
    } else if (registerActiveSession.deviceId !== deviceId) {
      // Mismo usuario pero distinto dispositivo intentando abrir la misma caja
      return NextResponse.json({
        error: "Ya tienes esta caja abierta en otro dispositivo",
        activeSessionId: registerActiveSession.id,
        activeDevice: registerActiveSession.deviceName
      }, { status: 409 })
    }
  }

  const cashSession = await withPrismaRetry(
    () =>
      prisma.cashSession.create({
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
      }),
    "cash-sessions:create"
  )

  return NextResponse.json(cashSession, { status: 201 })
}