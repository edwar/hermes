import { PrismaClient, UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 12)
  const cashierPassword = await bcrypt.hash("cajero123", 12)
  const managerPassword = await bcrypt.hash("gerente123", 12)

  const company = await prisma.company.upsert({
    where: { id: "default-company" },
    update: {},
    create: {
      id: "default-company",
      name: "Mi Empresa",
    },
  })

  const admin = await prisma.user.upsert({
    where: { email_companyId: { email: "admin@hermes.com", companyId: "default-company" } },
    update: {},
    create: {
      email: "admin@hermes.com",
      name: "Admin",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      companyId: "default-company",
    },
  })

  await prisma.user.upsert({
    where: { email_companyId: { email: "cajero@hermes.com", companyId: "default-company" } },
    update: {},
    create: {
      email: "cajero@hermes.com",
      name: "Cajero Principal",
      passwordHash: cashierPassword,
      role: UserRole.CASHIER,
      companyId: "default-company",
    },
  })

  await prisma.user.upsert({
    where: { email_companyId: { email: "gerente@hermes.com", companyId: "default-company" } },
    update: {},
    create: {
      email: "gerente@hermes.com",
      name: "Gerente",
      passwordHash: managerPassword,
      role: UserRole.MANAGER,
      companyId: "default-company",
    },
  })

  const categorias = await Promise.all([
    prisma.category.upsert({
      where: { name_companyId: { name: "Bebidas", companyId: "default-company" } },
      update: {},
      create: { name: "Bebidas", description: "Gaseosas, jugos, aguas", companyId: "default-company" },
    }),
    prisma.category.upsert({
      where: { name_companyId: { name: "Comidas Rápidas", companyId: "default-company" } },
      update: {},
      create: { name: "Comidas Rápidas", description: "Hamburguesas, perros, papas", companyId: "default-company" },
    }),
    prisma.category.upsert({
      where: { name_companyId: { name: "Lácteos", companyId: "default-company" } },
      update: {},
      create: { name: "Lácteos", description: "Leche, quesos, yogures", companyId: "default-company" },
    }),
    prisma.category.upsert({
      where: { name_companyId: { name: "Aseo", companyId: "default-company" } },
      update: {},
      create: { name: "Aseo", description: "Productos de limpieza e higiene", companyId: "default-company" },
    }),
  ])

  const productos = [
    { name: "Coca-Cola 350ml", barcode: "7701011001001", purchasePrice: 1800, profitMargin: 0.39, stock: 100, minStock: 20, categoryId: categorias[0].id },
    { name: "Agua Cristal 500ml", barcode: "7701011001002", purchasePrice: 1000, profitMargin: 0.50, stock: 80, minStock: 20, categoryId: categorias[0].id },
    { name: "Jugo Hit Tropical 400ml", barcode: "7701011001003", purchasePrice: 2200, profitMargin: 0.36, stock: 50, minStock: 15, categoryId: categorias[0].id },
    { name: "Hamburguesa Sencilla", barcode: "7701011001004", purchasePrice: 5000, profitMargin: 0.60, stock: 30, minStock: 10, categoryId: categorias[1].id },
    { name: "Perro Caliente", barcode: "7701011001005", purchasePrice: 4000, profitMargin: 0.75, stock: 25, minStock: 10, categoryId: categorias[1].id },
    { name: "Papas Fritas Grandes", barcode: "7701011001006", purchasePrice: 2500, profitMargin: 1.00, stock: 40, minStock: 10, categoryId: categorias[1].id },
    { name: "Leche Entera 1L", barcode: "7701011001007", purchasePrice: 3500, profitMargin: 0.20, stock: 3, minStock: 10, categoryId: categorias[2].id },
    { name: "Yogur Griego 150g", barcode: "7701011001008", purchasePrice: 2800, profitMargin: 0.25, stock: 20, minStock: 10, categoryId: categorias[2].id },
    { name: "Queso Campesino 250g", barcode: "7701011001009", purchasePrice: 5000, profitMargin: 0.30, stock: 12, minStock: 8, categoryId: categorias[2].id },
    { name: "Detergente Fab 500g", barcode: "7701011001010", purchasePrice: 3800, profitMargin: 0.26, stock: 35, minStock: 10, categoryId: categorias[3].id },
    { name: "Jabón Rey 300g", barcode: "7701011001011", purchasePrice: 1500, profitMargin: 0.47, stock: 4, minStock: 15, categoryId: categorias[3].id },
    { name: "Cloro Líquido 1L", barcode: "7701011001012", purchasePrice: 2800, profitMargin: 0.36, stock: 25, minStock: 10, categoryId: categorias[3].id },
  ]

  for (const p of productos) {
    const existing = await prisma.product.findFirst({ where: { barcode: p.barcode, companyId: "default-company" } })
    if (!existing) {
      await prisma.product.create({ data: { ...p, companyId: "default-company" } })
    }
  }

  const cajasData = [
    { name: "Caja Principal" },
    { name: "Caja 2" },
    { name: "Caja Auxiliar" },
  ]

  for (const c of cajasData) {
    const existing = await prisma.cashRegister.findFirst({ where: { name: c.name, companyId: "default-company" } })
    if (!existing) {
      await prisma.cashRegister.create({ data: { ...c, companyId: "default-company" } })
    }
  }

  const cajasCount = await prisma.cashRegister.count({ where: { companyId: "default-company" } })

  console.log("Seed completado exitosamente")
  console.log(`  - Admin: admin@hermes.com / admin123`)
  console.log(`  - Gerente: gerente@hermes.com / gerente123`)
  console.log(`  - Cajero: cajero@hermes.com / cajero123`)
  console.log(`  - ${productos.length} productos creados`)
  console.log(`  - ${cajasCount} cajas registradoras creadas`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
