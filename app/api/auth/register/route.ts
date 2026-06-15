import { NextRequest, NextResponse } from "next/server"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { UserRole } from "@prisma/client"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, name, email, password } = body

  if (!token || !name || !email || !password) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
  }

  const invite = await withPrismaRetry(
    () => prisma.companyInvite.findUnique({ where: { token } }),
    "register:invite-lookup"
  )

  if (!invite) {
    return NextResponse.json({ error: "Invitación no válida" }, { status: 400 })
  }

  if (invite.used) {
    return NextResponse.json({ error: "Esta invitación ya fue utilizada" }, { status: 400 })
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Esta invitación ha expirado" }, { status: 400 })
  }

  let company = await withPrismaRetry(
    () => prisma.company.findFirst({ where: { name: invite.companyName } }),
    "register:company-lookup"
  )

  if (!company) {
    company = await withPrismaRetry(
      () =>
        prisma.company.create({
          data: { name: invite.companyName },
        }),
      "register:company-create"
    )
  }

  const existingUser = await withPrismaRetry(
    () =>
      prisma.user.findFirst({
        where: { email, companyId: company.id },
      }),
    "register:user-exists-check"
  )

  if (existingUser) {
    return NextResponse.json({ error: "Ya existe un usuario con este email en la empresa" }, { status: 400 })
  }

  const passwordHash = await hash(password, 12)

  const user = await withPrismaRetry(
    () =>
      prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: "OWNER",
          companyId: company.id,
        },
      }),
    "register:user-create"
  )

  await withPrismaRetry(
    () =>
      prisma.companyInvite.update({
        where: { id: invite.id },
        data: { used: true, usedAt: new Date() },
      }),
    "register:invite-mark-used"
  )

  await withPrismaRetry(
    () =>
      prisma.storeSettings.create({
        data: {
          storeName: company.name,
          companyId: company.id,
        },
      }),
    "register:store-settings-create"
  )

  // Crear denominaciones de efectivo por defecto (Colombia)
  const denominations = [
    { value: 50, label: "$50" },
    { value: 100, label: "$100" },
    { value: 200, label: "$200" },
    { value: 500, label: "$500" },
    { value: 1000, label: "$1.000" },
    { value: 2000, label: "$2.000" },
    { value: 5000, label: "$5.000" },
    { value: 10000, label: "$10.000" },
    { value: 20000, label: "$20.000" },
    { value: 50000, label: "$50.000" },
    { value: 100000, label: "$100.000" },
  ]
  await withPrismaRetry(
    () =>
      prisma.cashDenomination.createMany({
        data: denominations.map((d, i) => ({
          value: d.value,
          label: d.label,
          sortOrder: i,
          companyId: company.id,
        })),
        skipDuplicates: true,
      }),
    "register:denominations-create"
  )

  // Crear configuraciones del sistema por defecto
  const systemConfigs = [
    { category: "FACTUS", key: "documentType", value: "01", label: "Tipo de documento", description: "Código del tipo de documento DIAN" },
    { category: "FACTUS", key: "operationType", value: "10", label: "Tipo de operación", description: "Código del tipo de operación" },
    { category: "FACTUS", key: "unitMeasureCode", value: "94", label: "Código unidad de medida", description: "Código de unidad de medida predeterminada" },
    { category: "FACTUS", key: "identificationStandard", value: "999", label: "Estándar de identificación", description: "Código del estándar de identificación de productos" },
  ]
  for (const config of systemConfigs) {
    await withPrismaRetry(
      () =>
        prisma.systemConfig.upsert({
          where: { category_key: { category: config.category, key: config.key } },
          update: {},
          create: config,
        }),
      "register:system-config-upsert"
    )
  }

  // Crear caja registradora por defecto
  await withPrismaRetry(
    () =>
      prisma.cashRegister.upsert({
        where: { name_companyId: { name: "Caja Principal", companyId: company.id } },
        update: {},
        create: {
          name: "Caja Principal",
          companyId: company.id,
        },
      }),
    "register:cash-register-upsert"
  )

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    company: { id: company.id, name: company.name },
  }, { status: 201 })
}
