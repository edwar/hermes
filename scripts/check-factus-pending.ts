import { prisma } from "@/lib/prisma"
import { listPendingBills, listPendingCreditNotes, factusRequest } from "@/lib/factus/client"
import * as readline from "readline/promises"
import { stdin as input, stdout as output } from "process"

interface FactusBillRow {
  id?: number | string
  number?: string
  reference_code?: string
  status?: string
  is_validated?: boolean
  created_at?: string
  customer?: { names?: string; identification?: string }
  total?: string | number
  errors?: Record<string, string>
}

function pad(s: string | undefined, n: number): string {
  if (!s) return "—".padEnd(n)
  return s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n)
}

function printTable(rows: FactusBillRow[], kind: string) {
  console.log(`\n=== ${kind} ===`)
  if (rows.length === 0) {
    console.log("  (sin resultados)")
    return
  }
  console.log(
    pad("ID", 8) +
      pad("NUMBER", 22) +
      pad("REF_CODE", 32) +
      pad("STATUS", 10) +
      pad("CREATED", 22) +
      "CUSTOMER"
  )
  console.log("-".repeat(110))
  for (const r of rows) {
    console.log(
      pad(String(r.id ?? "—"), 8) +
        pad(r.number, 22) +
        pad(r.reference_code, 32) +
        pad(String(r.status ?? r.is_validated ?? "—"), 10) +
        pad(r.created_at, 22) +
        (r.customer?.names ?? "—")
    )
  }
}

async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output })
  try {
    return await rl.question(question)
  } finally {
    rl.close()
  }
}

async function pickCompanyInteractive(): Promise<string | null> {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, factusEnabled: true, factusTokenExpiresAt: true },
  })
  if (companies.length === 0) {
    console.log("No hay empresas en la base de datos.")
    return null
  }
  console.log("\nEmpresas disponibles:")
  companies.forEach((c, i) => {
    const tokenStatus = c.factusTokenExpiresAt
      ? new Date(c.factusTokenExpiresAt) > new Date()
        ? "token OK"
        : "token EXPIRADO"
      : "sin token"
    console.log(`  ${i + 1}. ${c.name} (id=${c.id}) [${tokenStatus}]`)
  })

  if (companies.length === 1) {
    console.log(`\nUsando la única empresa: ${companies[0].name}`)
    return companies[0].id
  }

  const ans = await ask("\nNúmero de empresa: ")
  const idx = parseInt(ans) - 1
  if (isNaN(idx) || idx < 0 || idx >= companies.length) {
    console.log("Selección inválida.")
    return null
  }
  return companies[idx].id
}

async function deletePending(companyId: string, referenceCode: string): Promise<{ ok: boolean; detail: string }> {
  try {
    await factusRequest(
      `/v2/bills/destroy/reference/${encodeURIComponent(referenceCode)}`,
      { method: "DELETE" },
      companyId
    )
    return { ok: true, detail: "eliminado OK" }
  } catch (e: any) {
    return { ok: false, detail: e?.message || String(e) }
  }
}

async function main() {
  console.log("=== Diagnóstico de facturas pendientes en Factus ===\n")

  const companyId = await pickCompanyInteractive()
  if (!companyId) return

  console.log("\nConsultando Factus (bills)...")
  let bills: FactusBillRow[]
  try {
    bills = await listPendingBills(companyId)
  } catch (e: any) {
    console.log(`  ERROR al listar bills: ${e.message}`)
    console.log("  Esto puede ser un problema de autenticación o de la API.")
    return
  }
  printTable(bills, "Bills pendientes (filter[status]=0)")

  console.log("\nConsultando Factus (credit-notes)...")
  let creditNotes: FactusBillRow[] = []
  try {
    creditNotes = await listPendingCreditNotes(companyId)
  } catch (e: any) {
    console.log(`  ERROR al listar credit-notes: ${e.message}`)
  }
  printTable(creditNotes, "Notas crédito pendientes (filter[status]=0)")

  console.log("\n=== Resumen ===")
  const totalBills = bills.length
  const totalCN = creditNotes.length
  console.log(`  Bills pendientes:         ${totalBills}`)
  console.log(`  Notas crédito pendientes: ${totalCN}`)

  if (totalBills === 0 && totalCN === 0) {
    console.log("\n  ⚠️  No hay documentos pendientes según la API de Factus.")
    console.log("  Si Hermes sigue dando 409, las hipótesis son:")
    console.log("    1. El dashboard de Factus está usando un filtro o vista distinta.")
    console.log("    2. Hay una factura de otro tipo (soporte, ajuste) en otro endpoint.")
    console.log("    3. La cola está bloqueada por un rango de numeración agotado.")
    console.log("    4. El token de Hermes no coincide con la cuenta de Factus que estás revisando.")
    console.log("    5. Es una condición transitoria (petición en vuelo). Vuelve a intentar en 1-2 min.")
    return
  }

  console.log(`\n  Se encontraron ${totalBills + totalCN} documentos pendientes.`)
  console.log("\n¿Quieres intentar limpiar alguno?")
  console.log("  Esto llama a DELETE /v2/bills/destroy/reference/<ref> en Factus.")
  const ans = await ask("  Escribe el reference_code a limpiar (o Enter para salir): ")
  if (!ans.trim()) return

  const refCode = ans.trim()
  console.log(`\n  Limpiando referencia '${refCode}'...`)
  const result = await deletePending(companyId, refCode)
  if (result.ok) {
    console.log(`  ✅ ${result.detail}`)
    console.log("  Ahora puedes intentar la venta de nuevo en Hermes.")
  } else {
    console.log(`  ❌ ${result.detail}`)
    console.log("  Si dice 'no se encontró', el documento ya no está en Factus (puedes reintentar la venta).")
    console.log("  Si dice 'no se puede eliminar', la factura ya fue validada por la DIAN (puedes reintentar la venta).")
    console.log("  Si dice 'pending', el documento está en otro estado o tienes varios bloqueando.")
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
