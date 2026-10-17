// =============================================================================
// CIFRADO DE SECRETOS (AES-256-GCM)
// Se usa para guardar en la DB las credenciales de Factus de cada empresa.
// La llave viene de ENCRYPTION_KEY (32 bytes en base64 o 64 caracteres hex).
// Formato almacenado: v1:<iv>:<tag>:<ciphertext>, todo en base64.
// =============================================================================

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const VERSION = "v1"

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error("ENCRYPTION_KEY no está configurada")
  }
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY debe tener 32 bytes (base64 o 64 caracteres hex)")
  }
  return key
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":")
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(":")
  if (version !== VERSION || !iv || !tag || !data) {
    throw new Error("Formato de secreto cifrado inválido")
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8")
}
