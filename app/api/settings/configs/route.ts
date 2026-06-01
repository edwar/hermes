import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const companyId = session.user.companyId ?? "default"

  const paymentMethods = session.user.role === "GOD"
    ? []
    : await prisma.paymentMethodConfig.findMany({
        where: { companyId },
        orderBy: { internalCode: "asc" },
      })

  const systemConfigs = await prisma.systemConfig.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  })

  return NextResponse.json({ paymentMethods, systemConfigs })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role === "GOD") return NextResponse.json({ error: "GOD no puede modificar configuraciones" }, { status: 403 })

  const companyId = session.user.companyId ?? "default"
  const body = await req.json()

  if (body.type === "paymentMethod") {
    const { id, internalCode, name, factusPaymentForm, factusPaymentMethodCode, isActive } = body
    const data = { internalCode, name, factusPaymentForm: parseInt(factusPaymentForm), factusPaymentMethodCode, isActive: !!isActive, companyId }

    if (id) {
      await prisma.paymentMethodConfig.update({ where: { id }, data })
    } else {
      await prisma.paymentMethodConfig.create({ data })
    }
    return NextResponse.json({ success: true })
  }

  if (body.type === "systemConfig") {
    const { id, category, key, value, label, description, isActive } = body
    const data = { category, key, value, label, description, isActive: !!isActive }

    if (id) {
      await prisma.systemConfig.update({ where: { id }, data })
    } else {
      await prisma.systemConfig.create({ data })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role === "GOD") return NextResponse.json({ error: "GOD no puede eliminar configuraciones" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const type = searchParams.get("type")

  if (!id || !type) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })

  if (type === "paymentMethod") {
    await prisma.paymentMethodConfig.delete({ where: { id } })
  } else if (type === "systemConfig") {
    await prisma.systemConfig.delete({ where: { id } })
  }

  return NextResponse.json({ success: true })
}