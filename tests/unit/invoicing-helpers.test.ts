import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }))
vi.mock("@/lib/notifications", () => ({ notifyLowCredit: vi.fn() }))
vi.mock("@/lib/invoicing/index", () => ({ getProvider: vi.fn() }))

import { backoffMs, returnReferenceCode, saleReferenceCode, MAX_ATTEMPTS } from "@/lib/invoicing/emit"
import { isRejection } from "@/lib/invoicing/factus-provider"

describe("reference_code", () => {
  it("es estable por venta: reintentar nunca genera un código nuevo", () => {
    expect(saleReferenceCode("abc123")).toBe("sale-abc123")
    expect(saleReferenceCode("abc123")).toBe(saleReferenceCode("abc123"))
  })

  it("distingue facturas de notas crédito", () => {
    expect(returnReferenceCode("abc123")).toBe("return-abc123")
    expect(returnReferenceCode("abc123")).not.toBe(saleReferenceCode("abc123"))
  })
})

describe("backoff de reintentos", () => {
  it("crece de forma exponencial desde 30 segundos", () => {
    expect(backoffMs(1)).toBe(30_000)
    expect(backoffMs(2)).toBe(60_000)
    expect(backoffMs(3)).toBe(120_000)
  })

  it("nunca supera una hora", () => {
    expect(backoffMs(20)).toBe(60 * 60 * 1000)
  })

  it("trata intentos 0 o negativos como el primero", () => {
    expect(backoffMs(0)).toBe(30_000)
    expect(backoffMs(-3)).toBe(30_000)
  })

  it("el tope de intentos es finito", () => {
    expect(MAX_ATTEMPTS).toBeGreaterThan(0)
    expect(Number.isFinite(MAX_ATTEMPTS)).toBe(true)
  })
})

describe("isRejection", () => {
  it("reconoce un rechazo de la DIAN", () => {
    expect(isRejection("FAJ43b: Rechazo: NIT inválido")).toBe(true)
    expect(isRejection("rechazo")).toBe(true)
  })

  it("no confunde una notificación con un rechazo", () => {
    expect(isRejection("FAJ44b: el nombre no coincide con el RUT")).toBe(false)
    expect(isRejection("RUT01: aviso habitual")).toBe(false)
    expect(isRejection("")).toBe(false)
  })
})
