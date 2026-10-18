import { readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { KNOWN_MODULES } from "@/lib/permissions/resolve"
import { ROUTE_ACCESS } from "@/lib/permissions/route-registry"

// Lee el código de cada ruta de la API y comprueba que su acceso esté registrado y sea el que dice el registro.
const routeFiles = (readdirSync("app/api", { recursive: true }) as string[])
  .map((f) => f.replace(/\\/g, "/"))
  .filter((f) => f === "route.ts" || f.endsWith("/route.ts"))
const keyOf = (file: string) => file.replace(/\/?route\.ts$/, "")
const source = (key: string) => readFileSync(`app/api/${key}/route.ts`, "utf8")

describe("registro de acceso de las rutas de la API", () => {
  it("cada ruta está registrada y no sobran entradas", () => {
    const files = routeFiles.map(keyOf).sort()
    expect(files.length).toBeGreaterThan(40)
    expect(Object.keys(ROUTE_ACCESS).sort()).toEqual(files)
  })

  it("los módulos que nombra el registro existen", () => {
    for (const [key, access] of Object.entries(ROUTE_ACCESS)) {
      const modules = access.kind === "module" ? access.modules : access.kind === "legacy" ? [access.module] : []
      for (const m of modules) expect(KNOWN_MODULES, `${key} → ${m}`).toContain(m)
    }
  })

  it("las rutas «module» llaman a guardModule con cada módulo que declaran", () => {
    for (const [key, access] of Object.entries(ROUTE_ACCESS)) {
      if (access.kind !== "module") continue
      const code = source(key)
      for (const m of access.modules) expect(code, `${key} debe llamar guardModule("${m}")`).toContain(`guardModule("${m}")`)
      expect(code, `${key} no debe seguir con el helper anterior`).not.toContain("denyUnlessModule")
    }
  })

  it("las rutas «legacy» todavía no usan guardModule (al migrarlas, cámbialas a «module»)", () => {
    for (const [key, access] of Object.entries(ROUTE_ACCESS)) {
      if (access.kind === "legacy") expect(source(key), `${key} ya usa guardModule: regístrala como «module»`).not.toContain("guardModule(")
    }
  })

  it("las rutas «god» comprueban el rol GOD y las «session» piden sesión", () => {
    for (const [key, access] of Object.entries(ROUTE_ACCESS)) {
      const code = source(key)
      if (access.kind === "god") expect(code, key).toMatch(/USER_ROLE\.GOD|"GOD"|'GOD'/)
      if (access.kind === "session") expect(code, key).toMatch(/auth\(\)/)
    }
  })

  it("las brechas conocidas quedan a la vista para corregirlas", () => {
    const gaps = Object.entries(ROUTE_ACCESS).filter(([, a]) => a.kind === "legacy" && a.gap).map(([k]) => k)
    expect(gaps.sort()).toEqual(["exports/[report]", "settings", "settings/configs"])
  })
})
