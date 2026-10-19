import { existsSync, readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { KNOWN_MODULES } from "@/lib/permissions/resolve"

// Cada pantalla de la aplicación vive en una carpeta de app/(app); su layout.tsx es el guard del módulo.
const APP_DIR = "app/(app)"
const folders = readdirSync(APP_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  // /profile está abierto a todos los roles (ALWAYS_ALLOWED_MODULES), así que no lleva guard.
  .filter((name) => name !== "profile")

describe("guard de las pantallas", () => {
  it("hay carpetas de pantallas que revisar", () => {
    expect(folders.length).toBeGreaterThan(15)
  })

  it("cada pantalla tiene un layout.tsx que llama a requireModule con un módulo conocido", () => {
    for (const folder of folders) {
      const layout = `${APP_DIR}/${folder}/layout.tsx`
      expect(existsSync(layout), `${folder} necesita un layout.tsx con requireModule`).toBe(true)
      const code = readFileSync(layout, "utf8")
      const modules = [...code.matchAll(/requireModule\(\s*\[?([^)\]]+)\]?\s*\)/g)]
        .flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]))
      expect(modules.length, `${folder}: sin requireModule`).toBeGreaterThan(0)
      for (const m of modules) expect(KNOWN_MODULES, `${folder} → ${m}`).toContain(m)
    }
  })

  it("las pantallas no repiten la comprobación de rol: la decide el layout (y las reglas guardadas)", () => {
    // Se permiten los atajos que mandan al GOD a su panel; lo que no puede haber es negar el acceso por rol de empresa.
    for (const folder of folders) {
      const page = `${APP_DIR}/${folder}/page.tsx`
      if (!existsSync(page)) continue
      expect(readFileSync(page, "utf8"), `${folder}/page.tsx`).not.toMatch(/user\.role\s*!==\s*"(OWNER|ADMIN|MANAGER|CASHIER)"/)
    }
  })
})
