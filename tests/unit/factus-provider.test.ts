import { beforeEach, describe, expect, it, vi } from "vitest"

// Se simula el cliente HTTP de Factus: así se prueba cómo el adaptador traduce cada respuesta.
vi.mock("@/lib/factus/client", () => {
  class FactusApiError extends Error {
    constructor(
      message: string,
      public statusCode: number,
      public details?: Record<string, string[]>,
      public factusData?: Record<string, unknown>
    ) {
      super(message)
    }
  }
  class FactusNotConfiguredError extends Error {}
  return {
    FactusApiError,
    FactusNotConfiguredError,
    factusRequest: vi.fn(),
    getInvoice: vi.fn(),
    getNumberingRangeByDocumentType: vi.fn(async () => ({ factusRangeId: 389 })),
    listNumberingRanges: vi.fn(),
  }
})
vi.mock("@/lib/factus/mappers", () => ({
  mapSaleToFactusInvoice: vi.fn(async () => ({ reference_code: "x" })),
  mapSaleToFactusCreditNote: vi.fn(async () => ({ reference_code: "y" })),
}))

import * as client from "@/lib/factus/client"
import { factusProvider } from "@/lib/invoicing/factus-provider"

const { FactusApiError, FactusNotConfiguredError } = client
const factusRequest = vi.mocked(client.factusRequest)
const listNumberingRanges = vi.mocked(client.listNumberingRanges)
const getInvoice = vi.mocked(client.getInvoice)
const sale = { companyId: "c1", id: "s1" } as never

function bill(data: Record<string, unknown>) {
  return { status: "Created", message: "ok", data }
}

describe("factusProvider.issueInvoice", () => {
  beforeEach(() => {
    factusRequest.mockReset()
  })

  it("devuelve 'validated' con número y CUFE cuando la DIAN valida", async () => {
    factusRequest.mockResolvedValue(bill({ number: "SETP990000001", cufe: "abc", is_validated: true }))
    const out = await factusProvider.issueInvoice(sale, "sale-s1")
    expect(out).toMatchObject({ kind: "validated", number: "SETP990000001", cufe: "abc" })
  })

  it("una demora de la DIAN (sin rechazo) queda pendiente y no se descarta", async () => {
    factusRequest.mockResolvedValue(bill({ number: "SETP2", is_validated: false, errors: {} }))
    const out = await factusProvider.issueInvoice(sale, "sale-s1")
    expect(out.kind).toBe("pending")
  })

  it("una notificación sin la palabra 'rechazo' no cuenta como rechazo", async () => {
    factusRequest.mockResolvedValue(
      bill({ is_validated: false, errors: { FAJ44b: "El nombre de la empresa no coincide con el RUT" } })
    )
    const out = await factusProvider.issueInvoice(sale, "sale-s1")
    expect(out.kind).toBe("pending")
  })

  it("un rechazo de la DIAN se marca como rechazado con su motivo", async () => {
    factusRequest.mockResolvedValue(bill({ is_validated: false, errors: { FAJ43b: "Rechazo: NIT del adquirente inválido" } }))
    const out = await factusProvider.issueInvoice(sale, "sale-s1")
    expect(out).toMatchObject({ kind: "rejected" })
    expect(out.kind === "rejected" && out.reason).toContain("NIT del adquirente inválido")
  })

  it("409 (documento pendiente por enviar) queda pendiente para reintentar", async () => {
    factusRequest.mockRejectedValue(new FactusApiError("Conflicto", 409))
    const out = await factusProvider.issueInvoice(sale, "sale-s1")
    expect(out.kind).toBe("pending")
  })

  it("422 de validación se rechaza e incluye el detalle del campo", async () => {
    factusRequest.mockRejectedValue(
      new FactusApiError("Error de validación", 422, undefined, {
        data: { errors: { "customer.dv": ["El campo dígito de verificación no es valido"] } },
      })
    )
    const out = await factusProvider.issueInvoice(sale, "sale-s1")
    expect(out.kind).toBe("rejected")
    expect(out.kind === "rejected" && out.reason).toMatch(/customer\.dv.*dígito de verificación/)
  })

  it.each([401, 408, 429, 500, 503])("el error %i se reintenta, no se rechaza", async (status) => {
    factusRequest.mockRejectedValue(new FactusApiError("falla", status))
    const out = await factusProvider.issueInvoice(sale, "sale-s1")
    expect(out.kind).toBe("pending")
  })

  it("un error de red se reintenta", async () => {
    factusRequest.mockRejectedValue(new Error("fetch failed"))
    const out = await factusProvider.issueInvoice(sale, "sale-s1")
    expect(out).toMatchObject({ kind: "pending", reason: "fetch failed" })
  })

  it("una empresa sin credenciales se rechaza con un mensaje claro", async () => {
    factusRequest.mockRejectedValue(new FactusNotConfiguredError("La empresa no tiene credenciales de Factus configuradas"))
    const out = await factusProvider.issueInvoice(sale, "sale-s1")
    expect(out).toMatchObject({ kind: "rejected" })
    expect(out.kind === "rejected" && out.reason).toContain("credenciales")
  })

  it("envía el reference_code recibido al endpoint de validación de facturas", async () => {
    factusRequest.mockResolvedValue(bill({ is_validated: true, number: "N1" }))
    await factusProvider.issueInvoice(sale, "sale-s1")
    expect(factusRequest.mock.calls[0][0]).toBe("/v2/bills/validate")
    expect(factusRequest.mock.calls[0][2]).toBe("c1")
  })
})

describe("factusProvider.issueCreditNote", () => {
  beforeEach(() => {
    factusRequest.mockReset()
    listNumberingRanges.mockReset()
    getInvoice.mockReset()
  })

  it("se rechaza si no hay un rango de notas crédito activo", async () => {
    listNumberingRanges.mockResolvedValue({ data: { data: [{ id: 1, is_active: 0 }] } } as never)
    const out = await factusProvider.issueCreditNote(sale, "SETP1", "return-s1")
    expect(out).toMatchObject({ kind: "rejected" })
  })

  it("emite la nota con el primer rango activo y valida", async () => {
    listNumberingRanges.mockResolvedValue({ data: { data: [{ id: 7, is_active: 1 }] } } as never)
    getInvoice.mockResolvedValue({ data: { id: 55 } })
    factusRequest.mockResolvedValue(bill({ is_validated: true, number: "CRTE1" }))
    const out = await factusProvider.issueCreditNote(sale, "SETP1", "return-s1")
    expect(out).toMatchObject({ kind: "validated", number: "CRTE1" })
    expect(factusRequest.mock.calls[0][0]).toBe("/v2/credit-notes/validate")
  })

  it("sigue adelante si no se puede leer el id de la factura original", async () => {
    listNumberingRanges.mockResolvedValue({ data: { data: [{ id: 7, is_active: true }] } } as never)
    getInvoice.mockRejectedValue(new Error("no disponible"))
    factusRequest.mockResolvedValue(bill({ is_validated: true, number: "CRTE2" }))
    const out = await factusProvider.issueCreditNote(sale, "SETP1", "return-s1")
    expect(out.kind).toBe("validated")
  })
})

describe("factusProvider.discardRejected", () => {
  beforeEach(() => {
    factusRequest.mockReset()
  })

  it("usa el endpoint de facturas para borrar una factura", async () => {
    factusRequest.mockResolvedValue({})
    await factusProvider.discardRejected("c1", "sale-s1", "invoice")
    expect(factusRequest.mock.calls[0][0]).toBe("/v2/bills/destroy/reference/sale-s1")
    expect(factusRequest.mock.calls[0][1]).toMatchObject({ method: "DELETE" })
  })

  it("usa el endpoint propio de las notas crédito", async () => {
    factusRequest.mockResolvedValue({})
    await factusProvider.discardRejected("c1", "return-s1", "credit_note")
    expect(factusRequest.mock.calls[0][0]).toBe("/v2/credit-notes/reference/return-s1")
  })

  it("tolera un 404: Factus nunca llegó a guardar el documento", async () => {
    factusRequest.mockRejectedValue(new FactusApiError("No encontrado", 404))
    await expect(factusProvider.discardRejected("c1", "sale-s1", "invoice")).resolves.toBeUndefined()
  })

  it("no oculta otros errores", async () => {
    factusRequest.mockRejectedValue(new FactusApiError("Ya fue validada por la DIAN", 422))
    await expect(factusProvider.discardRejected("c1", "sale-s1", "invoice")).rejects.toThrow(/validada/)
  })

  it("codifica el reference_code en la URL", async () => {
    factusRequest.mockResolvedValue({})
    await factusProvider.discardRejected("c1", "a b/c", "invoice")
    expect(factusRequest.mock.calls[0][0]).toBe("/v2/bills/destroy/reference/a%20b%2Fc")
  })
})
