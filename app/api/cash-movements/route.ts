import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { type, amount, reason, sessionId, adminPassword } = body

  if (!type || !["IN", "OUT"].includes(type)) {
    return NextResponse.json({ error: "Tipo de movimiento inválido" }, { status: 400 })
  }

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 })
  }

  if (!reason?.trim()) {
    return NextResponse.json({ error: "La razón es requerida" }, { status: 400 })
  }

  if (!sessionId) {
    return NextResponse.json({ error: "Sesión de caja requerida" }, { status: 400 })
  }

  const cashSession = await prisma.cashSession.findFirst({
    where: { id: sessionId },
    include: { cashRegister: true },
  })

  if (!cashSession || cashSession.status !== "OPEN") {
    return NextResponse.json({ error: "La sesión de caja no está abierta" }, { status: 400 })
  }

  if (session.user.role === "GOD") {
    // GOD can do anything
  } else if (session.user.role === "ADMIN") {
    // ADMIN can only do movements in their company
    if (cashSession.cashRegister.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  } else {
    // CASHIER needs admin authorization
    if (cashSession.cashRegister.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (!adminPassword) {
      return NextResponse.json({ error: "AUTHORIZATION_REQUIRED", requiresAdmin: true }, { status: 403 })
    }

    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", companyId: session.user.companyId, isActive: true },
    })

    if (!adminUser) {
      return NextResponse.json({ error: "No hay administradores para autorizar" }, { status: 400 })
    }

    const isValid = await compare(adminPassword, adminUser.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: "Contraseña de administrador incorrecta" }, { status: 400 })
    }
  }

  const movement = await prisma.cashMovement.create({
    data: {
      type,
      amount,
      reason: reason.trim(),
      sessionId,
    },
  })

  return NextResponse.json(movement, { status: 201 })
}
