import { PrismaClient, UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Migrando datos existentes...")

  const defaultCompany = await prisma.company.upsert({
    where: { id: "default-company" },
    update: {},
    create: {
      id: "default-company",
      name: "Mi Empresa",
    },
  })
  console.log(`  Compañía "${defaultCompany.name}" lista`)

  const existingGod = await prisma.user.findFirst({ where: { email: "god@hermes.com" } })
  if (!existingGod) {
    const godPassword = await bcrypt.hash("god123", 12)
    await prisma.user.create({
      data: {
        email: "god@hermes.com",
        name: "Super Admin",
        passwordHash: godPassword,
        role: UserRole.GOD,
        isActive: true,
      },
    })
    console.log(`  Usuario GOD creado: god@hermes.com / god123`)
  } else {
    console.log(`  Usuario GOD ya existe: god@hermes.com`)
    if (existingGod.role !== UserRole.GOD) {
      await prisma.user.update({
        where: { id: existingGod.id },
        data: { role: UserRole.GOD },
      })
      console.log(`  Rol actualizado a GOD`)
    }
  }

  const existingUsers = await prisma.user.findMany({
    where: { companyId: null, email: { not: "god@hermes.com" } },
  })

  for (const user of existingUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { companyId: defaultCompany.id },
    })
    console.log(`  Usuario migrado: ${user.email} -> ${defaultCompany.name}`)
  }

  for (const model of ["Category", "Product", "Customer", "Sale", "StockMovement", "CashRegister"] as const) {
    const records = await (prisma as any)[model].findMany({ where: { companyId: null } })
    for (const record of records) {
      await (prisma as any)[model].update({
        where: { id: record.id },
        data: { companyId: defaultCompany.id },
      })
    }
    if (records.length > 0) console.log(`  ${records.length} ${model} migrados`)
  }

  const existingSettings = await prisma.storeSettings.findFirst({
    where: { storeName: { not: "DEFAULT" } },
  })
  if (existingSettings) {
    await prisma.storeSettings.update({
      where: { id: existingSettings.id },
      data: { companyId: defaultCompany.id },
    })
    console.log(`  StoreSettings migrado`)
  } else {
    await prisma.storeSettings.create({
      data: {
        storeName: defaultCompany.name,
        companyId: defaultCompany.id,
      },
    })
    console.log(`  StoreSettings creado por defecto`)
  }

  console.log("Migración completada exitosamente")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
