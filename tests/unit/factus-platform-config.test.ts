import { describe, expect, it } from "vitest"
import { isSandboxUrl, normalizeFactusUrl } from "@/lib/factus/platform-config"

describe("normalizeFactusUrl", () => {
  it("acepta el sandbox y producción, sin barra final", () => {
    expect(normalizeFactusUrl("https://api-sandbox.factus.com.co")).toBe("https://api-sandbox.factus.com.co")
    expect(normalizeFactusUrl(" https://api.factus.com.co/ ")).toBe("https://api.factus.com.co")
  })

  it("rechaza http, otros dominios y dominios que solo lo imitan", () => {
    for (const bad of [
      "http://api.factus.com.co",
      "https://evil.com",
      "https://factus.com.co.evil.com",
      "https://evilfactus.com.co",
      "https://api.factus.com.co@evil.com",
    ]) {
      expect(() => normalizeFactusUrl(bad), bad).toThrow()
    }
  })

  it("rechaza rutas, parámetros y valores que no son una URL", () => {
    for (const bad of ["https://api.factus.com.co/v2", "https://api.factus.com.co/?a=1", "api.factus.com.co", ""]) {
      expect(() => normalizeFactusUrl(bad), bad).toThrow()
    }
  })

  it("distingue sandbox de producción", () => {
    expect(isSandboxUrl("https://api-sandbox.factus.com.co")).toBe(true)
    expect(isSandboxUrl("https://api.factus.com.co")).toBe(false)
  })
})
