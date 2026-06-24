import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toCSV } from "@/lib/exporters/csv"
import { companyScope } from "@/lib/company-scope"
import { FACTUS_TRANSACTION_TYPE, USER_ROLE, SORT_DIRECTION, CONTENT_TYPE, HEADER_NAME } from "@/lib/constants"

const REPORTS = ["sales", "inventory", "electronic-invoices", "cash-movements", "credit-transactions", "stock-movements"] as const
type Report = typeof REPORTS[number]

const COLUMNS: Record<Report, { key: string; label: string }[]> = {
  "sales": [
    { key: "id", label: "ID" },
    { key: "createdAt", label: "Fecha" },
    { key: "total", label: "Total" },
    { key: "subtotal", label: "Subtotal" },
    { key: "tax", label: "IVA" },
    { key: "discount", label: "Descuento" },
    { key: "paymentMethod", label: "Método de Pago" },
    { key: "customer", label: "Cliente" },
    { key: "user", label: "Cajero" },
    { key: "itemsCount", label: "Items" },
    { key: "isReturn", label: "Es Devolución" },
  ],
  "inventory": [
    { key: "name", label: "Producto" },
    { key: "barcode", label: "Código" },
    { key: "category", label: "Categoría" },
    { key: "stock", label: "Stock" },
    { key: "minStock", label: "Stock Mínimo" },
    { key: "purchasePrice", label: "Precio Compra" },
    { key: "profitMargin", label: "Margen %" },
    { key: "isActive", label: "Activo" },
  ],
  "electronic-invoices": [
    { key: "consecutive", label: "Consecutivo" },
    { key: "createdAt", label: "Fecha" },
    { key: "status", label: "Estado" },
    { key: "total", label: "Total" },
    { key: "cufe", label: "CUFE" },
    { key: "type", label: "Tipo" },
    { key: "customer", label: "Cliente" },
  ],
  "cash-movements": [
    { key: "createdAt", label: "Fecha" },
    { key: "type", label: "Tipo" },
    { key: "amount", label: "Monto" },
    { key: "reason", label: "Razón" },
    { key: "user", label: "Usuario" },
  ],
  "credit-transactions": [
    { key: "createdAt", label: "Fecha" },
    { key: "company", label: "Empresa" },
    { key: "type", label: "Tipo" },
    { key: "amount", label: "Monto" },
    { key: "balanceAfter", label: "Saldo Después" },
    { key: "notes", label: "Notas" },
  ],
  "stock-movements": [
    { key: "createdAt", label: "Fecha" },
    { key: "type", label: "Tipo" },
    { key: "product", label: "Producto" },
    { key: "quantity", label: "Cantidad" },
    { key: "reason", label: "Razón" },
  ],
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ report: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { report } = await params
  if (!REPORTS.includes(report as Report)) {
    return NextResponse.json({ error: `Reporte no válido. Usar: ${REPORTS.join(", ")}` }, { status: 400 })
  }

  const scope = companyScope(session)
  const companyId = session.user.companyId
  const searchParams = req.nextUrl.searchParams
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const dateFilter: Record<string, Date> = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to + "T23:59:59.999Z")

  let rows: Record<string, unknown>[] = []

  switch (report) {
    case "sales": {
      const sales = await prisma.sale.findMany({
        where: { ...scope, ...(from || to ? { createdAt: dateFilter } : {}) },
        include: { customer: { select: { name: true } }, user: { select: { name: true } }, items: true },
        orderBy: { createdAt: SORT_DIRECTION.DESC },
        take: 5000,
      })
      rows = sales.map((s) => ({
        id: s.id.slice(0, 8),
        createdAt: s.createdAt.toISOString().split("T")[0],
        total: Number(s.total).toFixed(2),
        subtotal: Number(s.subtotal).toFixed(2),
        tax: Number(s.tax).toFixed(2),
        discount: Number(s.discount).toFixed(2),
        paymentMethod: s.paymentMethod,
        customer: s.customer?.name ?? "Consumidor Final",
        user: s.user?.name ?? "",
        itemsCount: s.items.length,
        isReturn: s.isReturn ? "Sí" : "No",
      }))
      break
    }

    case "inventory": {
      const products = await prisma.product.findMany({
        where: { ...scope },
        include: { category: { select: { name: true } } },
        orderBy: { name: SORT_DIRECTION.ASC },
      })
      rows = products.map((p) => ({
        name: p.name,
        barcode: p.barcode ?? "",
        category: p.category?.name ?? "",
        stock: p.stock,
        minStock: p.minStock,
        purchasePrice: Number(p.purchasePrice).toFixed(2),
        profitMargin: ((p.profitMargin ?? 0) * 100).toFixed(0),
        isActive: p.isActive ? "Sí" : "No",
      }))
      break
    }

    case "electronic-invoices": {
      const invoices = await prisma.electronicInvoice.findMany({
        where: { ...scope, ...(from || to ? { createdAt: dateFilter } : {}) },
        include: { sale: { include: { customer: { select: { name: true } } } } },
        orderBy: { createdAt: SORT_DIRECTION.DESC },
        take: 5000,
      })
      rows = invoices.map((inv) => ({
        consecutive: inv.consecutive ?? "",
        createdAt: inv.createdAt.toISOString().split("T")[0],
        status: inv.status,
        total: Number(inv.total).toFixed(2),
        cufe: inv.cufe?.slice(0, 20) ?? "",
        type: inv.sale?.isReturn ? "Nota Crédito" : "Factura",
        customer: inv.sale?.customer?.name ?? "",
      }))
      break
    }

    case "cash-movements": {
      const movements = await prisma.cashMovement.findMany({
        where: { ...scope, ...(from || to ? { createdAt: dateFilter } : {}) },
        include: { session: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: SORT_DIRECTION.DESC },
        take: 5000,
      })
      rows = movements.map((m) => ({
        createdAt: m.createdAt.toISOString().split("T")[0],
        type: m.type,
        amount: Number(m.amount).toFixed(2),
        reason: m.reason ?? "",
        user: m.session?.user?.name ?? "",
      }))
      break
    }

    case "credit-transactions": {
      if (session.user.role !== USER_ROLE.GOD) {
        return NextResponse.json({ error: "Solo GOD" }, { status: 403 })
      }
      const txs = await prisma.factusCreditTransaction.findMany({
        where: { ...(from || to ? { createdAt: dateFilter } : {}) },
        include: { company: { select: { name: true } } },
        orderBy: { createdAt: SORT_DIRECTION.DESC },
        take: 5000,
      })
      rows = txs.map((tx) => ({
        createdAt: tx.createdAt.toISOString().split("T")[0],
        company: tx.company?.name ?? "",
        type: tx.type === FACTUS_TRANSACTION_TYPE.PURCHASE ? "Compra" : "Consumo",
        amount: tx.type === FACTUS_TRANSACTION_TYPE.PURCHASE ? `+${tx.amount}` : `-${tx.amount}`,
        balanceAfter: tx.balanceAfter,
        notes: tx.notes ?? "",
      }))
      break
    }

    case "stock-movements": {
      const movements = await prisma.stockMovement.findMany({
        where: { ...scope, ...(from || to ? { createdAt: dateFilter } : {}) },
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: SORT_DIRECTION.DESC },
        take: 5000,
      })
      rows = movements.map((m) => ({
        createdAt: m.createdAt.toISOString().split("T")[0],
        type: m.type,
        product: m.product?.name ?? "Producto eliminado",
        quantity: m.quantity,
        reason: m.reason ?? "",
      }))
      break
    }
  }

  const csv = toCSV(rows, COLUMNS[report as Report])

  return new NextResponse(csv, {
    headers: {
      [HEADER_NAME.CONTENT_TYPE]: CONTENT_TYPE.CSV,
      [HEADER_NAME.CONTENT_DISPOSITION]: `attachment; filename="${report}-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
