// Limpieza de los datos que crea la prueba de recepción de compras (proveedor, producto y pedido).
// No hay API para borrarlos, así que se hace directamente en la base de pruebas.

export async function removePurchaseData(supplierName: string, productName: string) {
  const url = process.env.E2E_DATABASE_URL
  if (!url) throw new Error("Define E2E_DATABASE_URL para limpiar los datos de la prueba")
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    const supplierIds = (await prisma.supplier.findMany({ where: { name: supplierName }, select: { id: true } })).map((s) => s.id)
    const productIds = (await prisma.product.findMany({ where: { name: productName }, select: { id: true } })).map((p) => p.id)
    const orders = await prisma.purchaseOrder.findMany({ where: { supplierId: { in: supplierIds } }, select: { id: true } })
    const orderIds = orders.map((o) => o.id)
    await prisma.purchaseOrderItem.deleteMany({ where: { OR: [{ purchaseOrderId: { in: orderIds } }, { productId: { in: productIds } }] } })
    await prisma.purchaseOrder.deleteMany({ where: { id: { in: orderIds } } })
    await prisma.stockMovement.deleteMany({ where: { productId: { in: productIds } } })
    await prisma.product.deleteMany({ where: { id: { in: productIds } } })
    await prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } })
  } finally {
    await prisma.$disconnect()
  }
}
