import { describe, expect, it } from "vitest"
import { MODULE_LABELS, NAV_ACCESS } from "@/lib/navigation"
import { buildMatrix, buildUserMatrix, CONFIGURABLE_MODULES, ruleAction } from "@/lib/permissions/matrix"
import { PLATFORM_MODULES, type PermissionRuleData } from "@/lib/permissions/resolve"

const rule = (over: Partial<PermissionRuleData>): PermissionRuleData => ({
  scope: "GLOBAL", role: "CASHIER", companyId: null, userId: null, module: "/reports", allowed: true, ...over,
})

describe("matriz de permisos", () => {
  it("sin reglas muestra los valores por defecto y nada personalizado", () => {
    const m = buildMatrix([], null)
    expect(m.scope).toBe("GLOBAL")
    for (const role of m.roles) {
      for (const { module } of m.modules) {
        const cell = m.cells[role][module]
        expect(cell.overridden, `${role} ${module}`).toBe(false)
        expect(cell.allowed).toBe(cell.inherited)
        expect(cell.allowed).toBe((NAV_ACCESS[module] as readonly string[]).includes(role))
      }
    }
  })

  it("solo ofrece módulos configurables, todos con nombre", () => {
    for (const mod of CONFIGURABLE_MODULES) {
      expect(PLATFORM_MODULES).not.toContain(mod)
      expect(MODULE_LABELS[mod], mod).toBeTruthy()
    }
    expect(CONFIGURABLE_MODULES).not.toContain("/profile")
    expect(CONFIGURABLE_MODULES).toContain("/electronic-invoices/manage")
    for (const key of Object.keys(NAV_ACCESS)) expect(MODULE_LABELS[key], `${key} sin nombre`).toBeTruthy()
  })

  it("una regla global se marca como personalizada y recuerda a qué vuelve si se quita", () => {
    const cell = buildMatrix([rule({})], null).cells.CASHIER["/reports"]
    expect(cell).toMatchObject({ allowed: true, source: "global", overridden: true, inherited: false })
  })

  it("en la vista de una empresa, su regla gana a la global y vuelve a lo global si se quita", () => {
    const rules = [rule({ allowed: false, module: "/pos" }), rule({ scope: "COMPANY", companyId: "c1", allowed: true, module: "/pos" })]
    const cell = buildMatrix(rules, "c1").cells.CASHIER["/pos"]
    expect(cell).toMatchObject({ allowed: true, source: "company", overridden: true, inherited: false })
    // La vista global no ve la regla de la empresa
    expect(buildMatrix(rules, null).cells.CASHIER["/pos"]).toMatchObject({ allowed: false, source: "global" })
    // Otra empresa no se afecta
    expect(buildMatrix(rules, "c2").cells.CASHIER["/pos"]).toMatchObject({ allowed: false, source: "global", overridden: false })
  })

  it("al dueño no se le pueden quitar Usuarios ni Configuración", () => {
    const m = buildMatrix([], null)
    expect(m.cells.OWNER["/users"].locked).toBe(true)
    expect(m.cells.OWNER["/settings"].locked).toBe(true)
    expect(m.cells.ADMIN["/users"].locked).toBe(false)
  })

  it("ruleAction guarda una regla solo si difiere de lo heredado", () => {
    expect(ruleAction(true, false)).toBe("set")
    expect(ruleAction(false, true)).toBe("set")
    expect(ruleAction(true, true)).toBe("remove")
    expect(ruleAction(false, false)).toBe("remove")
  })
})

describe("matriz de una persona", () => {
  const me = { userId: "u1", role: "CASHIER", companyId: "c1" }
  const own = (over: Partial<PermissionRuleData>): PermissionRuleData => rule({ scope: "USER", role: null, userId: "u1", ...over })

  it("sin reglas muestra los valores de su rol", () => {
    const m = buildUserMatrix([], me)
    expect(m.scope).toBe("USER")
    for (const { module } of m.modules) {
      expect(m.cells[module].allowed, module).toBe((NAV_ACCESS[module] as readonly string[]).includes("CASHIER"))
      expect(m.cells[module].overridden).toBe(false)
    }
  })

  it("una regla personal gana a las de su empresa y recuerda a qué vuelve al quitarla", () => {
    const rules = [rule({ scope: "COMPANY", companyId: "c1", module: "/inventory", allowed: false }), own({ module: "/inventory", allowed: true })]
    expect(buildUserMatrix(rules, me).cells["/inventory"]).toMatchObject({ allowed: true, source: "user", overridden: true, inherited: false })
  })

  it("las reglas de otra persona no cuentan", () => {
    const m = buildUserMatrix([own({ userId: "u2", module: "/inventory", allowed: true })], me)
    expect(m.cells["/inventory"]).toMatchObject({ allowed: false, overridden: false })
  })

  it("lo heredado de la empresa o lo global se ve con su origen", () => {
    const m = buildUserMatrix([rule({ module: "/reports", allowed: true })], me)
    expect(m.cells["/reports"]).toMatchObject({ allowed: true, source: "global", overridden: false })
  })

  it("al dueño no se le pueden quitar Usuarios ni Configuración, ni a título personal", () => {
    const m = buildUserMatrix([], { userId: "o1", role: "OWNER", companyId: "c1" })
    expect(m.cells["/users"].locked).toBe(true)
    expect(m.cells["/settings"].locked).toBe(true)
    expect(m.cells["/inventory"].locked).toBe(false)
  })
})
