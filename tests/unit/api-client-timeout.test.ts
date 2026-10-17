import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const added = vi.hoisted(() => [] as unknown[])
vi.mock("@/lib/db", () => ({
  db: { offlineMutations: { add: vi.fn(async (m: unknown) => void added.push(m)) } },
}))

import { apiFetch, DEFAULT_TIMEOUT_MS, ELECTRONIC_INVOICE_TIMEOUT_MS } from "@/lib/api-client"

/** Un servidor que responde bien, pero tarda `ms` en hacerlo. */
function slowServer(ms: number) {
  return vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
      setTimeout(() => resolve(new Response(JSON.stringify({ id: "sale-1" }), { status: 200 })), ms)
    })
  )
}

describe("apiFetch: plazo de espera", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    added.length = 0
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("los plazos son los esperados", () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(5_000)
    expect(ELECTRONIC_INVOICE_TIMEOUT_MS).toBeGreaterThan(30_000)
  })

  it("por defecto, una petición que tarda más de 5 s se encola como si no hubiera red", async () => {
    vi.stubGlobal("fetch", slowServer(7_000))
    const pending = apiFetch("/api/sales", { method: "POST", body: { total: 1 }, resource: "sale" })
    await vi.advanceTimersByTimeAsync(5_100)
    const result = await pending
    expect(result).toMatchObject({ ok: true, queued: true })
    expect(added).toHaveLength(1)
  })

  it("con el plazo largo la venta con factura electrónica espera la respuesta y no se encola", async () => {
    vi.stubGlobal("fetch", slowServer(7_000))
    const pending = apiFetch("/api/sales", {
      method: "POST",
      body: { total: 1, requestElectronicInvoice: true },
      resource: "sale",
      timeoutMs: ELECTRONIC_INVOICE_TIMEOUT_MS,
    })
    await vi.advanceTimersByTimeAsync(7_100)
    const result = await pending
    expect(result).toMatchObject({ ok: true, data: { id: "sale-1" } })
    expect("queued" in result && result.queued).toBeFalsy()
    expect(added).toHaveLength(0)
  })

  it("aun con el plazo largo, si el servidor nunca responde, se encola al vencer", async () => {
    vi.stubGlobal("fetch", slowServer(10 * 60_000))
    const pending = apiFetch("/api/sales", { method: "POST", body: {}, resource: "sale", timeoutMs: ELECTRONIC_INVOICE_TIMEOUT_MS })
    await vi.advanceTimersByTimeAsync(ELECTRONIC_INVOICE_TIMEOUT_MS + 100)
    expect(await pending).toMatchObject({ ok: true, queued: true })
  })
})
