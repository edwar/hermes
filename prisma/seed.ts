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

  const paymentMethods = [
    { internalCode: 'CASH', name: 'Efectivo', factusPaymentForm: 1, factusPaymentMethodCode: '10' },
    { internalCode: 'CARD', name: 'Tarjeta', factusPaymentForm: 1, factusPaymentMethodCode: '48' },
    { internalCode: 'TRANSFER', name: 'Transferencia', factusPaymentForm: 1, factusPaymentMethodCode: '47' },
    { internalCode: 'CREDIT', name: 'Crédito', factusPaymentForm: 2, factusPaymentMethodCode: '20' },
  ]

  for (const pm of paymentMethods) {
    const existing = await prisma.paymentMethodConfig.findFirst({ where: { internalCode: pm.internalCode, companyId: "default-company" } })
    if (!existing) {
      await prisma.paymentMethodConfig.create({ data: { ...pm, companyId: "default-company" } })
    }
  }

  const systemConfigs = [
    { category: 'FACTUS', key: 'documentType', value: '01', label: 'Tipo de documento', description: 'Código del tipo de documento DIAN' },
    { category: 'FACTUS', key: 'operationType', value: '10', label: 'Tipo de operación', description: 'Código del tipo de operación' },
    { category: 'FACTUS', key: 'unitMeasureCode', value: '94', label: 'Código unidad de medida', description: 'Código de unidad de medida predeterminada' },
    { category: 'FACTUS', key: 'identificationStandard', value: '999', label: 'Estándar de identificación', description: 'Código del estándar de identificación de productos' },
  ]

  for (const config of systemConfigs) {
    const existing = await prisma.systemConfig.findFirst({ where: { category: config.category, key: config.key } })
    if (!existing) {
      await prisma.systemConfig.create({ data: config })
    }
  }

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

  for (let i = 0; i < denominations.length; i++) {
    const d = denominations[i]
    await prisma.cashDenomination.upsert({
      where: { value_companyId: { value: d.value, companyId: "default-company" } },
      update: {},
      create: {
        value: d.value,
        label: d.label,
        sortOrder: i,
        companyId: "default-company",
      },
    })
  }

  console.log("Seed completado exitosamente")
  console.log(`  - Admin: admin@hermes.com / admin123`)
  console.log(`  - Gerente: gerente@hermes.com / gerente123`)
  console.log(`  - Cajero: cajero@hermes.com / cajero123`)
  console.log(`  - ${productos.length} productos creados`)
  console.log(`  - ${cajasCount} cajas registradoras creadas`)
  console.log(`  - ${paymentMethods.length} métodos de pago configurados`)
  console.log(`  - ${systemConfigs.length} configuraciones del sistema`)
  console.log(`  - ${denominations.length} denominaciones de efectivo`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
