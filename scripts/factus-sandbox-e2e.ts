// Prueba de extremo a extremo de la emisión de documentos contra el SANDBOX de Factus.
// Escribe en la base apuntada por DATABASE_URL: úsala solo con una rama de pruebas.
//   DATABASE_URL=<rama> ENCRYPTION_KEY=<clave> npx tsx --env-file=.env scripts/factus-sandbox-e2e.ts
import { prisma } from "../lib/prisma"
import { encryptSecret } from "../lib/crypto"
import { emitInvoiceForSale, emitCreditNoteForReturn, saleReferenceCode } from "../lib/invoicing/emit"
import { retryPendingInvoices } from "../lib/invoicing/retry"
import { factusProvider } from "../lib/invoicing/factus-provider"
import { FE_STATUS } from "../lib/constants"

const COMPANY_ID = "default-company"
let failures = 0
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? "  -> " + JSON.stringify(detail) : ""}`)
}

async function newSale(opts: { customerId: string | null; parentSaleId?: string; qty?: number }) {
  const user = await prisma.user.findFirstOrThrow({ where: { companyId: COMPANY_ID } })
  const product = await prisma.product.findFirstOrThrow({ where: { companyId: COMPANY_ID } })
  const qty = opts.qty ?? 2
  const sub = 10000 * qty
  const isReturn = Boolean(opts.parentSaleId)
  return prisma.sale.create({
    data: {
      subtotal: sub, tax: sub * 0.19, discount: 0, total: sub * 1.19,
      paymentMethod: "CASH", userId: user.id, companyId: COMPANY_ID,
      customerId: opts.customerId, requestElectronicInvoice: !isReturn,
      isReturn, parentSaleId: opts.parentSaleId, returnReason: isReturn ? "Prueba e2e" : undefined,
      items: { create: [{ productId: product.id, quantity: qty, unitPrice: 10000, subtotal: sub }] },
    },
  })
}

async function main() {
  if (!process.env.FACTUS_API_URL?.includes("sandbox")) throw new Error("Solo contra sandbox")

  // --- Preparación: empresa con credenciales PROPIAS cifradas (no las globales) ---
  await prisma.company.update({
    where: { id: COMPANY_ID },
    data: {
      name: "Comercio de Prueba SAS", nit: "900123456", factusDv: "8", address: "Calle 1 # 2-3",
      email: "prueba@hermes.test", phone: "3001234567", factusEnabled: true, factusBlocked: false,
      factusCreditBalance: 10,
      factusClientId: process.env.FACTUS_CLIENT_ID, factusClientSecretEnc: encryptSecret(process.env.FACTUS_CLIENT_SECRET!),
      factusUsername: process.env.FACTUS_USERNAME, factusPasswordEnc: encryptSecret(process.env.FACTUS_PASSWORD!),
      factusAccessToken: null, factusRefreshToken: null, factusTokenExpiresAt: null,
    },
  })
  await prisma.companyNumberingRange.upsert({
    where: { companyId_documentType: { companyId: COMPANY_ID, documentType: "21" } },
    update: { factusRangeId: 389, prefix: "SETP" },
    create: { companyId: COMPANY_ID, documentType: "21", factusRangeId: 389, prefix: "SETP" },
  })
  const customer = await prisma.customer.upsert({
    where: { cedula_companyId: { cedula: "1234567890", companyId: COMPANY_ID } },
    update: {}, create: { name: "Cliente Prueba", cedula: "1234567890", documentType: "13", email: "cliente@test.co", address: "Calle 5", companyId: COMPANY_ID },
  })
  const credits = async () => (await prisma.company.findUniqueOrThrow({ where: { id: COMPANY_ID } })).factusCreditBalance
  const creditTx = () => prisma.factusCreditTransaction.count({ where: { companyId: COMPANY_ID } })

  // --- T1: factura de venta ---
  const s1 = await newSale({ customerId: customer.id })
  const c0 = await credits()
  const r1 = await emitInvoiceForSale(s1.id, COMPANY_ID)
  console.log("T1 resultado:", JSON.stringify(r1))
  check("T1 factura validada", r1.status === FE_STATUS.VALIDATED)
  check("T1 descontó exactamente 1 crédito", (await credits()) === c0 - 1, { antes: c0, despues: await credits() })

  // --- T2: reemitir la misma venta no duplica ni vuelve a cobrar ---
  const r2 = await emitInvoiceForSale(s1.id, COMPANY_ID)
  check("T2 reemisión devuelve la misma factura", r2.status === FE_STATUS.VALIDATED && "number" in r2 && "number" in r1 && r2.number === r1.number)
  check("T2 no cobró otro crédito", (await credits()) === c0 - 1)

  // --- T3: idempotencia en Factus con el mismo reference_code ---
  const s2 = await newSale({ customerId: customer.id })
  const full = await prisma.sale.findUniqueOrThrow({ where: { id: s2.id }, include: { items: { include: { product: true } }, customer: true, company: true } })
  const ref = saleReferenceCode(s2.id)
  const a = await factusProvider.issueInvoice(full, ref)
  const b = await factusProvider.issueInvoice(full, ref)
  console.log("T3 a:", JSON.stringify(a).slice(0, 300))
  check("T3 mismo reference_code => mismo número (sin duplicar)", a.kind === "validated" && b.kind === "validated" && a.number === b.number, { a: a.kind === "validated" ? a.number : a, b: b.kind === "validated" ? b.number : b })

  // --- T4: el worker de reintentos resuelve una factura 'perdida' (existe en Factus, pendiente en Hermes) ---
  await prisma.electronicInvoice.create({ data: { companyId: COMPANY_ID, saleId: s2.id, referenceCode: ref, status: "PENDING", total: s2.total, taxTotal: s2.tax, nextRetryAt: new Date(Date.now() - 1000) } })
  const c1 = await credits()
  const summary = await retryPendingInvoices({ companyId: COMPANY_ID })
  const ei2 = await prisma.electronicInvoice.findUniqueOrThrow({ where: { saleId: s2.id } })
  console.log("T4 resumen:", JSON.stringify(summary))
  check("T4 worker validó la pendiente con el mismo número", ei2.status === "VALIDATED" && a.kind === "validated" && ei2.consecutive === a.number, { estado: ei2.status, numero: ei2.consecutive })
  check("T4 cobró 1 crédito", (await credits()) === c1 - 1)

  // --- T5: nota crédito de la devolución ---
  const ret = await newSale({ customerId: customer.id, parentSaleId: s1.id, qty: 1 })
  const r5 = await emitCreditNoteForReturn(ret.id, COMPANY_ID)
  console.log("T5 resultado:", JSON.stringify(r5))
  check("T5 nota crédito validada", r5.status === FE_STATUS.VALIDATED)
  const c2 = await credits()
  const r5b = await emitCreditNoteForReturn(ret.id, COMPANY_ID)
  check("T5 reemisión idempotente y sin cobro", r5b.status === FE_STATUS.VALIDATED && (await credits()) === c2)

  // --- T6: nota crédito sobre una factura no validada se omite ---
  const sPending = await newSale({ customerId: customer.id })
  await prisma.electronicInvoice.create({ data: { companyId: COMPANY_ID, saleId: sPending.id, status: "PENDING", total: sPending.total } })
  const retPending = await newSale({ customerId: customer.id, parentSaleId: sPending.id, qty: 1 })
  const r6 = await emitCreditNoteForReturn(retPending.id, COMPANY_ID)
  check("T6 sin factura original validada => skipped", r6.status === "skipped", r6)

  // --- T7: rechazo (cliente con NIT y DV inválidos) ---
  const badCustomer = await prisma.customer.upsert({
    where: { cedula_companyId: { cedula: "123", companyId: COMPANY_ID } },
    update: {}, create: { name: "NIT Malo", cedula: "123", documentType: "31", dv: "9", companyId: COMPANY_ID },
  })
  const s7 = await newSale({ customerId: badCustomer.id })
  const c3 = await credits()
  const r7 = await emitInvoiceForSale(s7.id, COMPANY_ID)
  console.log("T7 resultado:", JSON.stringify(r7))
  check("T7 NO quedó validada", r7.status !== FE_STATUS.VALIDATED)
  check("T7 no cobró crédito", (await credits()) === c3)

  // --- T8: sin créditos no se crea el documento ---
  await prisma.company.update({ where: { id: COMPANY_ID }, data: { factusCreditBalance: 0 } })
  const s8 = await newSale({ customerId: customer.id })
  const r8 = await emitInvoiceForSale(s8.id, COMPANY_ID)
  check("T8 sin créditos => skipped", r8.status === "skipped", r8)

  console.log("\nCréditos de transacciones registradas:", await creditTx())
  console.log(failures === 0 ? "\nTODO OK" : `\n${failures} verificación(es) fallaron`)
}

main()
  .catch((e) => { console.error("ERROR", e?.message, e?.statusCode, JSON.stringify(e?.factusData ?? e?.details ?? {})); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
