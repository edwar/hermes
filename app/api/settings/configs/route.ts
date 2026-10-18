import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { guardModule } from "@/lib/permissions/guard"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { USER_ROLE, SORT_DIRECTION } from "@/lib/constants"

// La configuración de Factus de la plataforma (categoría "factus") tiene su propia pantalla y API,
// solo para el GOD (/api/god/factus-config): aquí nunca se lista ni se modifica.
const PLATFORM_CATEGORY = "factus"

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

  // Los ajustes del sistema son globales: solo los ve el GOD.
  const systemConfigs = session.user.role === USER_ROLE.GOD
    ? await withPrismaRetry(
        () =>
          prisma.systemConfig.findMany({
            where: { category: { not: PLATFORM_CATEGORY } },
            orderBy: [{ category: SORT_DIRECTION.ASC }, { key: SORT_DIRECTION.ASC }],
          }),
        "configs:system"
      )
    : []

  return NextResponse.json({ paymentMethods, systemConfigs })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const companyId = session.user.companyId ?? "default"
  const body = await req.json()

  if (session.user.role === USER_ROLE.GOD && body.type !== "systemConfig") return NextResponse.json({ error: "GOD no puede modificar configuraciones de empresa" }, { status: 403 })

  if (body.type === "paymentMethod") {
    const guard = await guardModule("/settings")
    if ("error" in guard) return guard.error

    const { id, internalCode, name, factusPaymentForm, factusPaymentMethodCode, isActive } = body
    const data = { internalCode, name, factusPaymentForm: parseInt(factusPaymentForm), factusPaymentMethodCode, isActive: !!isActive, companyId }

    if (id) {
      await withPrismaRetry(
        () => prisma.paymentMethodConfig.update({ where: { id, companyId }, data }),
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
    // Los ajustes del sistema son globales: solo los cambia el GOD, y no los de Factus.
    if (session.user.role !== USER_ROLE.GOD) return NextResponse.json({ error: "Solo el administrador de plataforma puede cambiar los ajustes del sistema" }, { status: 403 })
    const { id, category, key, value, label, description, isActive } = body
    if (category === PLATFORM_CATEGORY) return NextResponse.json({ error: "La configuración de Factus se cambia en su propia pantalla" }, { status: 400 })
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
    const guard = await guardModule("/settings")
    if ("error" in guard) return guard.error
    // Solo los medios de pago de la propia empresa.
    const deleted = await withPrismaRetry(
      () => prisma.paymentMethodConfig.deleteMany({ where: { id, companyId: session.user.companyId ?? "default" } }),
      "configs:delete-payment-method"
    )
    if (deleted.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  } else {
    // Los ajustes del sistema no se eliminan desde la API.
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
