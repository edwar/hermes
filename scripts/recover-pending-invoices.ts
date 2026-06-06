import { prisma } from "@/lib/prisma"
import { mapSaleToFactusInvoice } from "@/lib/factus/mappers"
import { factusRequest, getNumberingRangeByDocumentType, FactusApiError, listPendingBills } from "@/lib/factus/client"
import * as readline from "readline/promises"
import { stdin as input, stdout as output } from "process"

interface AffectedSale {
  id: string
  localId: string | null
  total: number
  paymentMethod: string
  createdAt: Date
  customer: { name: string; cedula: string | null } | null
  user: { name: string }
  hasFactusToken: boolean
}

async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output })
  try {
    return await rl.question(question)
  } finally {
    rl.close()
  }
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

async function findAffectedSales(companyId: string): Promise<AffectedSale[]> {
  const sales = await prisma.sale.findMany({
    where: {
      companyId,
      isReturn: false,
      requestElectronicInvoice: true,
      electronicInvoice: null,
    },
    include: {
      customer: { select: { name: true, cedula: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return sales.map((s) => ({
    id: s.id,
    localId: s.localId,
    total: Number(s.total),
    paymentMethod: s.paymentMethod,
    createdAt: s.createdAt,
    customer: s.customer,
    user: s.user,
    hasFactusToken: false,
  }))
}

async function retrySaleFactus(companyId: string, saleId: string): Promise<{ ok: boolean; detail: string }> {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId, companyId },
    include: {
      items: { include: { product: true } },
      customer: true,
      company: true,
    },
  })

  if (!sale) return { ok: false, detail: "Venta no encontrada" }

  const rangeRecord = await getNumberingRangeByDocumentType(companyId, "21")
  if (!rangeRecord) return { ok: false, detail: "No hay rango de numeración para facturas (21) configurado" }

  // Best-effort: clear any pendings in Factus before retrying. If they
  // can't be cleared (e.g. 'ya enviado a la DIAN'), the validate below
  // will still fail with 409 and surface the real blocker to the user.
  try {
    const pendings = await listPendingBills(companyId)
    for (const p of pendings) {
      if (!p.reference_code) continue
      try {
        await factusRequest(
          `/v2/bills/destroy/reference/${encodeURIComponent(p.reference_code)}`,
          { method: "DELETE" },
          companyId
        )
      } catch {
        // best effort, ignore
      }
    }
  } catch {
    // best effort
  }

  const referenceCode = `recovery-${sale.id.slice(0, 8)}-${Date.now()}`

  try {
    const payload = await mapSaleToFactusInvoice(
      sale as any,
      rangeRecord.factusRangeId,
      referenceCode
    )

    const factusResponse = await factusRequest<{
      id: number
      consecutive: string
      cufe: string
      status: string
    }>(
      "/v2/bills/validate",
      { method: "POST", body: JSON.stringify(payload) },
      companyId
    )

    const inner: any = (factusResponse as any).data ?? factusResponse
    const isValidated = inner.is_validated === true || factusResponse.status === "Created" || factusResponse.status === "accepted"
    const factusBillId = inner.number || factusResponse.consecutive || String(inner.id || factusResponse.id || "unknown")
    const status = isValidated ? "VALIDATED" : "PENDING"

    await prisma.electronicInvoice.create({
      data: {
        companyId,
        saleId: sale.id,
        cufe: inner.cufe || factusResponse.cufe || null,
        consecutive: inner.number || factusResponse.consecutive || null,
        status,
        factusBillId,
        referenceCode,
        total: sale.total,
        taxTotal: sale.tax,
        validatedAt: isValidated ? new Date() : null,
      },
    })

    return { ok: true, detail: `Factura ${factusBillId} creada (${status})` }
  } catch (e) {
    if (e instanceof FactusApiError) {
      return { ok: false, detail: `${e.statusCode} ${e.message}` }
    }
    return { ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}

async function pickCompanyInteractive(): Promise<string | null> {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, factusEnabled: true },
  })
  if (companies.length === 0) {
    console.log("No hay empresas.")
    return null
  }
  console.log("\nEmpresas disponibles:")
  companies.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name} (id=${c.id}) [${c.factusEnabled ? "Factus ON" : "Factus OFF"}]`)
  })
  if (companies.length === 1) {
    console.log(`\nUsando la única empresa: ${companies[0].name}`)
    return companies[0].id
  }
  const ans = await ask("\nNúmero de empresa: ")
  const idx = parseInt(ans) - 1
  if (isNaN(idx) || idx < 0 || idx >= companies.length) return null
  return companies[idx].id
}

async function main() {
  console.log("=== Recuperación de ventas sin factura electrónica ===\n")
  console.log("Busca ventas con requestElectronicInvoice=true que NO tienen ElectronicInvoice")
  console.log("y permite reintentar la emisión de FE. Útil para recuperar ventas afectadas por")
  console.log("errores 409 de Factus que ocurrieron antes de que el fix de silenciamiento se")
  console.log("aplicara.\n")

  const companyId = await pickCompanyInteractive()
  if (!companyId) return

  const sales = await findAffectedSales(companyId)
  if (sales.length === 0) {
    console.log("\n✅ No hay ventas afectadas. Todo en orden.")
    return
  }

  console.log(`\nSe encontraron ${sales.length} ventas sin FE:\n`)
  console.log(
    "#".padEnd(4) +
      "ID".padEnd(28) +
      "Fecha".padEnd(22) +
      "Total".padEnd(16) +
      "Cliente"
  )
  console.log("-".repeat(120))
  sales.forEach((s, i) => {
    const dateStr = s.createdAt.toISOString().replace("T", " ").slice(0, 19)
    console.log(
      String(i + 1).padEnd(4) +
        s.id.slice(0, 26).padEnd(28) +
        dateStr.padEnd(22) +
        formatCOP(s.total).padEnd(16) +
        (s.customer ? `${s.customer.name} (${s.customer.cedula ?? "—"})` : "Consumidor final")
    )
  })

  console.log("\nOpciones:")
  console.log("  - 'todo' para reintentar TODAS")
  console.log("  - '1,3,5' para reintentar específicas (separadas por coma)")
  console.log("  - 'no' o Enter para salir")
  const ans = await ask("\nSelección: ")

  if (!ans.trim() || ans.trim().toLowerCase() === "no") return

  let toProcess: AffectedSale[] = []
  if (ans.trim().toLowerCase() === "todo") {
    toProcess = sales
  } else {
    const indices = ans
      .split(",")
      .map((s) => parseInt(s.trim()) - 1)
      .filter((i) => i >= 0 && i < sales.length)
    toProcess = indices.map((i) => sales[i])
  }

  if (toProcess.length === 0) {
    console.log("Selección inválida.")
    return
  }

  console.log(`\nProcesando ${toProcess.length} ventas...\n`)
  let ok = 0
  let fail = 0
  for (const sale of toProcess) {
    process.stdout.write(`  ${sale.id.slice(0, 8)}... `)
    const result = await retrySaleFactus(companyId, sale.id)
    if (result.ok) {
      console.log(`✅ ${result.detail}`)
      ok++
    } else {
      console.log(`❌ ${result.detail}`)
      fail++
    }
  }

  console.log(`\n=== Resumen ===`)
  console.log(`  Exitosas:  ${ok}`)
  console.log(`  Fallidas:  ${fail}`)
  if (fail > 0) {
    console.log("\n  Las fallidas继续保持 el error. Las hipótesis más comunes:")
    console.log("    1. Factus aún tiene una factura pendiente (corre check-factus-pending.ts primero).")
    console.log("    2. La venta no tiene cliente con cédula válida (requerido para FE).")
    console.log("    3. El rango de numeración está agotado o desactivado.")
  }
}

main()
  .catch((e) => {
    console.error("Error fatal:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
