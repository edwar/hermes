/* eslint-disable @typescript-eslint/no-explicit-any -- el Prisma simulado es deliberadamente laxo */
import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Prisma en memoria: solo lo que usa lib/invoicing/emit.ts.
// ---------------------------------------------------------------------------
type Row = Record<string, any>
const db = vi.hoisted(() => ({
  company: {} as Row,
  sale: null as Row | null,
  invoices: [] as Row[],
  creditTx: [] as Row[],
}))

function matches(row: Row, where: Row): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === "OR") {
      if (!(cond as Row[]).some((c) => matches(row, c))) return false
      continue
    }
    const value = row[key]
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      if ("in" in cond && !cond.in.includes(value)) return false
      if ("lte" in cond && !(value != null && value <= cond.lte)) return false
    } else if (value !== cond) return false
  }
  return true
}

function applyData(row: Row, data: Row) {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && !(v instanceof Date)) {
      if ("increment" in v) row[k] = (row[k] ?? 0) + v.increment
      else if ("decrement" in v) row[k] = (row[k] ?? 0) - v.decrement
    } else if (v !== undefined) row[k] = v
  }
}

vi.mock("@/lib/prisma", () => {
  const fake: any = {
    company: {
      findUnique: async () => db.company,
      update: async ({ data }: Row) => {
        applyData(db.company, data)
        return { factusCreditBalance: db.company.factusCreditBalance }
      },
    },
    sale: { findFirst: async () => db.sale },
    electronicInvoice: {
      findUnique: async ({ where }: Row) => db.invoices.find((i) => i.saleId === where.saleId) ?? null,
      create: async ({ data }: Row) => {
        // saleId es único en la base real
        if (db.invoices.some((i) => i.saleId === data.saleId)) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
        }
        const row = { id: `inv-${db.invoices.length + 1}`, attempts: 0, nextRetryAt: null, cufe: null, consecutive: null, ...data }
        db.invoices.push(row)
        return row
      },
      updateMany: async ({ where, data }: Row) => {
        const hits = db.invoices.filter((i) => matches(i, where))
        hits.forEach((i) => applyData(i, data))
        return { count: hits.length }
      },
      update: async ({ where, data }: Row) => {
        const row = db.invoices.find((i) => i.id === where.id)!
        applyData(row, data)
        return row
      },
    },
    factusCreditTransaction: {
      create: async ({ data }: Row) => {
        db.creditTx.push(data)
        return data
      },
    },
    $transaction: async (cb: (tx: any) => Promise<unknown>) => cb(fake),
  }
  return { prisma: fake }
})

const provider = vi.hoisted(() => ({
  name: "fake",
  issueInvoice: vi.fn(),
  issueCreditNote: vi.fn(),
  discardRejected: vi.fn(async () => undefined),
}))
vi.mock("@/lib/invoicing/index", () => ({ getProvider: () => provider }))
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/notifications", () => ({ notifyLowCredit: vi.fn(async () => undefined) }))

import { emitCreditNoteForReturn, emitInvoiceForSale, MAX_ATTEMPTS } from "@/lib/invoicing/emit"
import { FE_STATUS } from "@/lib/constants"

const validated = (n = "SETP1") => ({ kind: "validated", number: n, cufe: "cufe", providerRef: n, raw: {} })

function reset(overrides: { company?: Row; sale?: Row | null } = {}) {
  db.company = { factusEnabled: true, factusBlocked: false, factusCreditBalance: 5, ...overrides.company }
  db.sale = overrides.sale === undefined
    ? { id: "s1", companyId: "c1", total: 11900, tax: 1900, items: [], customer: null, company: { id: "c1" }, parentSale: null }
    : overrides.sale
  db.invoices = []
  db.creditTx = []
  provider.issueInvoice.mockReset()
  provider.issueCreditNote.mockReset()
  provider.discardRejected.mockClear()
}

describe("emitInvoiceForSale", () => {
  beforeEach(() => reset())

  it("no hace nada si la facturación electrónica está deshabilitada o bloqueada", async () => {
    reset({ company: { factusEnabled: false } })
    expect(await emitInvoiceForSale("s1", "c1")).toMatchObject({ status: "skipped" })
    reset({ company: { factusBlocked: true } })
    expect(await emitInvoiceForSale("s1", "c1")).toMatchObject({ status: "skipped" })
    expect(provider.issueInvoice).not.toHaveBeenCalled()
  })

  it("sin créditos no crea el documento ni llama al proveedor", async () => {
    reset({ company: { factusCreditBalance: 0 } })
    expect(await emitInvoiceForSale("s1", "c1")).toMatchObject({ status: "skipped" })
    expect(db.invoices).toHaveLength(0)
    expect(provider.issueInvoice).not.toHaveBeenCalled()
  })

  it("al validarse descuenta exactamente un crédito y registra la transacción", async () => {
    provider.issueInvoice.mockResolvedValue(validated("SETP9"))
    const out = await emitInvoiceForSale("s1", "c1")
    expect(out).toMatchObject({ status: FE_STATUS.VALIDATED, number: "SETP9" })
    expect(db.company.factusCreditBalance).toBe(4)
    expect(db.creditTx).toEqual([expect.objectContaining({ amount: 1, balanceAfter: 4, saleId: "s1" })])
    expect(db.invoices[0]).toMatchObject({ status: "VALIDATED", consecutive: "SETP9", referenceCode: "sale-s1" })
  })

  it("reemitir una venta ya validada es idempotente: no llama al proveedor ni cobra otra vez", async () => {
    provider.issueInvoice.mockResolvedValue(validated())
    await emitInvoiceForSale("s1", "c1")
    const again = await emitInvoiceForSale("s1", "c1")
    expect(again.status).toBe(FE_STATUS.VALIDATED)
    expect(provider.issueInvoice).toHaveBeenCalledTimes(1)
    expect(db.company.factusCreditBalance).toBe(4)
  })

  it("usa siempre el mismo reference_code al reintentar", async () => {
    provider.issueInvoice.mockResolvedValueOnce({ kind: "pending", reason: "DIAN" }).mockResolvedValueOnce(validated())
    await emitInvoiceForSale("s1", "c1")
    db.invoices[0].nextRetryAt = new Date(Date.now() - 1000)
    await emitInvoiceForSale("s1", "c1")
    expect(provider.issueInvoice.mock.calls.map((c) => c[1])).toEqual(["sale-s1", "sale-s1"])
  })

  it("una demora de la DIAN deja el documento pendiente, programa reintento y no cobra", async () => {
    provider.issueInvoice.mockResolvedValue({ kind: "pending", reason: "Pendiente de validación por la DIAN" })
    const out = await emitInvoiceForSale("s1", "c1")
    expect(out).toMatchObject({ status: FE_STATUS.PENDING })
    const inv = db.invoices[0]
    expect(inv.attempts).toBe(1)
    expect(inv.nextRetryAt.getTime()).toBeGreaterThan(Date.now())
    expect(inv.errorMessage).toContain("DIAN")
    expect(db.company.factusCreditBalance).toBe(5)
    expect(db.creditTx).toHaveLength(0)
  })

  it("un rechazo libera la cola en Factus, no cobra y no reintenta solo", async () => {
    provider.issueInvoice.mockResolvedValue({ kind: "rejected", reason: "Rechazo: NIT inválido" })
    const out = await emitInvoiceForSale("s1", "c1")
    expect(out).toMatchObject({ status: FE_STATUS.REJECTED, reason: "Rechazo: NIT inválido" })
    expect(provider.discardRejected).toHaveBeenCalledWith("c1", "sale-s1", "invoice")
    expect(db.invoices[0]).toMatchObject({ status: "REJECTED", nextRetryAt: null })
    expect(db.company.factusCreditBalance).toBe(5)
  })

  it("tras corregir los datos, un documento rechazado se puede volver a emitir", async () => {
    provider.issueInvoice.mockResolvedValueOnce({ kind: "rejected", reason: "Rechazo" }).mockResolvedValueOnce(validated("SETP2"))
    await emitInvoiceForSale("s1", "c1")
    const out = await emitInvoiceForSale("s1", "c1")
    expect(out).toMatchObject({ status: FE_STATUS.VALIDATED, number: "SETP2" })
    expect(db.company.factusCreditBalance).toBe(4)
  })

  it("un intento en vuelo bloquea a otro: responde 'busy' sin llamar al proveedor", async () => {
    provider.issueInvoice.mockResolvedValue({ kind: "pending", reason: "DIAN" })
    await emitInvoiceForSale("s1", "c1")
    provider.issueInvoice.mockClear()
    const out = await emitInvoiceForSale("s1", "c1") // nextRetryAt sigue en el futuro
    expect(out.status).toBe("busy")
    expect(provider.issueInvoice).not.toHaveBeenCalled()
  })

  it("dos emisiones simultáneas de la misma venta llaman una sola vez al proveedor", async () => {
    provider.issueInvoice.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10))
      return validated()
    })
    const [a, b] = await Promise.all([emitInvoiceForSale("s1", "c1"), emitInvoiceForSale("s1", "c1")])
    expect([a.status, b.status].sort()).toEqual(["VALIDATED", "busy"])
    expect(provider.issueInvoice).toHaveBeenCalledTimes(1)
    expect(db.company.factusCreditBalance).toBe(4)
  })

  it("al agotar los reintentos deja de programar nuevos y lo explica", async () => {
    provider.issueInvoice.mockResolvedValue({ kind: "pending", reason: "DIAN" })
    await emitInvoiceForSale("s1", "c1")
    db.invoices[0].attempts = MAX_ATTEMPTS - 1
    db.invoices[0].nextRetryAt = new Date(Date.now() - 1000)
    await emitInvoiceForSale("s1", "c1")
    expect(db.invoices[0].nextRetryAt).toBeNull()
    expect(db.invoices[0].errorMessage).toMatch(/Reintentos agotados/)
  })
})

describe("emitCreditNoteForReturn", () => {
  const returnSale = (original: Row | null) => ({
    id: "r1", companyId: "c1", total: 11900, tax: 1900, items: [], customer: null, company: { id: "c1" },
    parentSale: original ? { electronicInvoice: original } : null,
  })

  it("exige que la factura original esté validada", async () => {
    reset({ sale: returnSale({ status: "PENDING", consecutive: "SETP1" }) })
    expect(await emitCreditNoteForReturn("r1", "c1")).toMatchObject({ status: "skipped" })
    reset({ sale: returnSale(null) })
    expect(await emitCreditNoteForReturn("r1", "c1")).toMatchObject({ status: "skipped" })
    expect(provider.issueCreditNote).not.toHaveBeenCalled()
  })

  it("emite contra la factura original, con referencia propia, y no consume crédito", async () => {
    reset({ sale: returnSale({ status: "VALIDATED", consecutive: "SETP1" }) })
    provider.issueCreditNote.mockResolvedValue(validated("CRTE7"))
    const out = await emitCreditNoteForReturn("r1", "c1")
    expect(out).toMatchObject({ status: FE_STATUS.VALIDATED, number: "CRTE7" })
    expect(provider.issueCreditNote).toHaveBeenCalledWith(expect.anything(), "SETP1", "return-r1")
    expect(db.company.factusCreditBalance).toBe(5)
    expect(db.creditTx).toHaveLength(0)
  })

  it("funciona aunque la empresa se haya quedado sin créditos", async () => {
    reset({ company: { factusCreditBalance: 0 }, sale: returnSale({ status: "VALIDATED", consecutive: "SETP1" }) })
    provider.issueCreditNote.mockResolvedValue(validated("CRTE8"))
    expect((await emitCreditNoteForReturn("r1", "c1")).status).toBe(FE_STATUS.VALIDATED)
  })

  it("un rechazo borra la nota en Factus con su propio endpoint", async () => {
    reset({ sale: returnSale({ status: "VALIDATED", consecutive: "SETP1" }) })
    provider.issueCreditNote.mockResolvedValue({ kind: "rejected", reason: "Rechazo" })
    await emitCreditNoteForReturn("r1", "c1")
    expect(provider.discardRejected).toHaveBeenCalledWith("c1", "return-r1", "credit_note")
  })
})
