import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { USER_ROLE, SORT_DIRECTION } from "@/lib/constants"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const companyId = session.user.companyId ?? "default"

  const paymentMethods = session.user.role === USER_ROLE.GOD
    ? []
    : await withPrismaRetry(
        () =>
          prisma.paymentMethodConfig.findMany({
            where: { companyId },
            orderBy: { internalCode: SORT_DIRECTION.ASC },
          }),
        "configs:payment-methods"
      )

  const systemConfigs = await withPrismaRetry(
    () =>
      prisma.systemConfig.findMany({
        orderBy: [{ category: SORT_DIRECTION.ASC }, { key: SORT_DIRECTION.ASC }],
      }),
    "configs:system"
  )

  return NextResponse.json({ paymentMethods, systemConfigs })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const companyId = session.user.companyId ?? "default"
  const body = await req.json()

  if (session.user.role === USER_ROLE.GOD && body.type !== "systemConfig") return NextResponse.json({ error: "GOD no puede modificar configuraciones de empresa" }, { status: 403 })

  if (body.type === "paymentMethod") {
    const { id, internalCode, name, factusPaymentForm, factusPaymentMethodCode, isActive } = body
    const data = { internalCode, name, factusPaymentForm: parseInt(factusPaymentForm), factusPaymentMethodCode, isActive: !!isActive, companyId }

    if (id) {
      await withPrismaRetry(
        () => prisma.paymentMethodConfig.update({ where: { id }, data }),
        "configs:update-payment-method"
      )
    } else {
      await withPrismaRetry(
        () => prisma.paymentMethodConfig.create({ data }),
        "configs:create-payment-method"
      )
    }
    return NextResponse.json({ success: true })
  }

  if (body.type === "systemConfig") {
    const { id, category, key, value, label, description, isActive } = body
    const data = { category, key, value, label, description, isActive: !!isActive }

    if (id) {
      await withPrismaRetry(
        () => prisma.systemConfig.update({ where: { id }, data }),
        "configs:update-system-config"
      )
    } else {
      await withPrismaRetry(
        () => prisma.systemConfig.create({ data }),
        "configs:create-system-config"
      )
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role === USER_ROLE.GOD) return NextResponse.json({ error: "GOD no puede eliminar configuraciones" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const type = searchParams.get("type")

  if (!id || !type) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })

  if (type === "paymentMethod") {
    await withPrismaRetry(
      () => prisma.paymentMethodConfig.delete({ where: { id } }),
      "configs:delete-payment-method"
    )
  } else if (type === "systemConfig") {
    await withPrismaRetry(
      () => prisma.systemConfig.delete({ where: { id } }),
      "configs:delete-system-config"
    )
  }

  return NextResponse.json({ success: true })
}