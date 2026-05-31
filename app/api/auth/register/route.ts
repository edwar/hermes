import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, name, email, password } = body

  if (!token || !name || !email || !password) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
  }

  const invite = await prisma.companyInvite.findUnique({ where: { token } })

  if (!invite) {
    return NextResponse.json({ error: "Invitación no válida" }, { status: 400 })
  }

  if (invite.used) {
    return NextResponse.json({ error: "Esta invitación ya fue utilizada" }, { status: 400 })
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Esta invitación ha expirado" }, { status: 400 })
  }

  let company = await prisma.company.findFirst({ where: { name: invite.companyName } })

  if (!company) {
    company = await prisma.company.create({
      data: { name: invite.companyName },
    })
  }

  const existingUser = await prisma.user.findFirst({
    where: { email, companyId: company.id },
  })

  if (existingUser) {
    return NextResponse.json({ error: "Ya existe un usuario con este email en la empresa" }, { status: 400 })
  }

  const passwordHash = await hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
      companyId: company.id,
    },
  })

  await prisma.companyInvite.update({
    where: { id: invite.id },
    data: { used: true, usedAt: new Date() },
  })

  await prisma.storeSettings.create({
    data: {
      storeName: company.name,
      companyId: company.id,
    },
  })

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    company: { id: company.id, name: company.name },
  }, { status: 201 })
}
