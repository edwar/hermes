import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { randomBytes } from "node:crypto"
import { decryptSecret, encryptSecret } from "@/lib/crypto"

const KEY = randomBytes(32).toString("base64")

describe("lib/crypto", () => {
  const original = process.env.ENCRYPTION_KEY
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = KEY
  })
  afterEach(() => {
    process.env.ENCRYPTION_KEY = original
  })

  it("cifra y descifra devolviendo el texto original", () => {
    const secret = "cl4v3-ñ-€-secreta"
    expect(decryptSecret(encryptSecret(secret))).toBe(secret)
  })

  it("usa un IV distinto en cada cifrado", () => {
    expect(encryptSecret("igual")).not.toBe(encryptSecret("igual"))
  })

  it("el formato incluye versión y no deja ver el texto plano", () => {
    const payload = encryptSecret("super-secreto")
    expect(payload.startsWith("v1:")).toBe(true)
    expect(payload).not.toContain("super-secreto")
  })

  it("detecta manipulación del contenido cifrado", () => {
    const [v, iv, tag, data] = encryptSecret("dato").split(":")
    const tampered = Buffer.from(data, "base64")
    tampered[0] ^= 0xff
    expect(() => decryptSecret([v, iv, tag, tampered.toString("base64")].join(":"))).toThrow()
  })

  it("rechaza un formato inválido", () => {
    expect(() => decryptSecret("texto-plano")).toThrow(/inválido/)
  })

  it("no descifra con otra llave", () => {
    const payload = encryptSecret("dato")
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64")
    expect(() => decryptSecret(payload)).toThrow()
  })

  it("acepta la llave en hexadecimal (64 caracteres)", () => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex")
    expect(decryptSecret(encryptSecret("hex"))).toBe("hex")
  })

  it("falla con un mensaje claro si falta la llave o es corta", () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encryptSecret("x")).toThrow(/ENCRYPTION_KEY no está configurada/)
    process.env.ENCRYPTION_KEY = Buffer.from("corta").toString("base64")
    expect(() => encryptSecret("x")).toThrow(/32 bytes/)
  })
})
