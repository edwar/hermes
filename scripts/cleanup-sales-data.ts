import { prisma } from "@/lib/prisma"

async function main() {
  console.log("Eliminando datos transaccionales...\n")

  // 1. Romper auto-referencia de ventas (parentSaleId)
  const disownedReturns = await prisma.sale.updateMany({
    where: { parentSaleId: { not: null } },
    data: { parentSaleId: null },
  })
  console.log(`  Referencias de devolución rotas: ${disownedReturns.count}`)

  // 2. Desvincular ventas de sesiones de caja
  const detachedSessions = await prisma.sale.updateMany({
    where: { sessionId: { not: null } },
    data: { sessionId: null },
  })
  console.log(`  Ventas desvinculadas de sesiones: ${detachedSessions.count}`)

  // 3. Desvincular movimientos de stock de órdenes de compra
  await prisma.stockMovement.updateMany({
    where: { purchaseOrderId: { not: null } },
    data: { purchaseOrderId: null },
  })

  // 4. Facturas electrónicas
  const deletedInvoices = await prisma.electronicInvoice.deleteMany()
  console.log(`  Facturas electrónicas eliminadas: ${deletedInvoices.count}`)

  // 5. Items de venta
  const deletedItems = await prisma.saleItem.deleteMany()
  console.log(`  Items de venta eliminados: ${deletedItems.count}`)

  // 6. Ventas
  const deletedSales = await prisma.sale.deleteMany()
  console.log(`  Ventas eliminadas: ${deletedSales.count}`)

  // 7. Movimientos de caja
  const deletedCashMovements = await prisma.cashMovement.deleteMany()
  console.log(`  Movimientos de caja eliminados: ${deletedCashMovements.count}`)

  // 8. Sesiones de caja
  const deletedSessions = await prisma.cashSession.deleteMany()
  console.log(`  Sesiones de caja eliminadas: ${deletedSessions.count}`)

  // 9. Movimientos de stock (ya sin referencia a purchaseOrder)
  const deletedStock = await prisma.stockMovement.deleteMany()
  console.log(`  Movimientos de stock eliminados: ${deletedStock.count}`)

  // 10. Órdenes de compra (cascade elimina PurchaseOrderItem)
  const deletedOrders = await prisma.purchaseOrder.deleteMany()
  console.log(`  Órdenes de compra eliminadas: ${deletedOrders.count}`)

  console.log("\nDatos transaccionales eliminados correctamente.")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
