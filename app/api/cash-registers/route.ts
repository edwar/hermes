import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const registers = await prisma.cashRegister.findMany({
    where: companyScope(session),
    orderBy: { name: "asc" },
  })

  return NextResponse.json(registers)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "GOD")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!session.user.companyId) {
    return NextResponse.json({ error: "No tienes una empresa asignada" }, { status: 400 })
  }

  const body = await req.json()
  const { name } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
  }

  const where = { name: name.trim(), ...companyScope(session) }
  const existing = await prisma.cashRegister.findFirst({ where })
  if (existing) {
    return NextResponse.json({ error: "Ya existe una caja con ese nombre" }, { status: 400 })
  }

  const register = await prisma.cashRegister.create({
    data: { name: name.trim(), companyId: session.user.companyId },
  })

  return NextResponse.json(register, { status: 201 })
}