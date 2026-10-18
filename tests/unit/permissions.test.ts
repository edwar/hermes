import { describe, expect, it } from "vitest"
import { ALL_ROLES, NAV_ACCESS } from "@/lib/navigation"
import {
  allowedModules,
  KNOWN_MODULES,
  OWNER_LOCKED_MODULES,
  PLATFORM_MODULES,
  resolveAccess,
  subjectKey,
  validateRule,
  type PermissionRuleData,
  type PermissionSubject,
} from "@/lib/permissions/resolve"

const rule = (over: Partial<PermissionRuleData>): PermissionRuleData => ({
  scope: "GLOBAL", role: "CASHIER", companyId: null, userId: null, module: "/reports", allowed: true, ...over,
})
const as = (role: string, over: Partial<PermissionSubject> = {}): PermissionSubject => ({ userId: "u1", role, companyId: "c1", ...over })

describe("sin reglas guardadas, nada cambia", () => {
  it("el resultado es idéntico a NAV_ACCESS para todos los roles y módulos", () => {
    for (const role of ALL_ROLES.filter((r) => r !== "GOD")) {
      for (const mod of KNOWN_MODULES) {
        expect(resolveAccess(as(role), mod, []).allowed, `${role} → ${mod}`).toBe(
          (NAV_ACCESS[mod] as readonly string[]).includes(role)
        )
      }
    }
  })

  it("el GOD accede a todo y un módulo desconocido se niega a los demás", () => {
    for (const mod of KNOWN_MODULES) expect(resolveAccess(as("GOD"), mod, []).allowed).toBe(true)
    expect(resolveAccess(as("OWNER"), "/no-existe", []).allowed).toBe(false)
    expect(resolveAccess(as(""), "/pos", []).allowed).toBe(false)
  })
})

describe("capas: usuario → empresa → global → defecto", () => {
  it("una regla global cambia el acceso de todo ese rol", () => {
    expect(resolveAccess(as("CASHIER"), "/reports", []).allowed).toBe(false)
    const r = resolveAccess(as("CASHIER"), "/reports", [rule({ scope: "GLOBAL" })])
    expect(r).toEqual({ allowed: true, source: "global" })
    expect(resolveAccess(as("CASHIER"), "/pos", [rule({ module: "/pos", allowed: false })])).toEqual({ allowed: false, source: "global" })
  })

  it("la regla de empresa gana a la global, pero solo para su empresa y su rol", () => {
    const global = rule({ scope: "GLOBAL", allowed: false })
    const company = rule({ scope: "COMPANY", companyId: "c1", allowed: true })
    expect(resolveAccess(as("CASHIER"), "/reports", [global, company])).toEqual({ allowed: true, source: "company" })
    expect(resolveAccess(as("CASHIER", { companyId: "c2" }), "/reports", [global, company]).allowed).toBe(false)
    expect(resolveAccess(as("MANAGER"), "/reports", [rule({ scope: "COMPANY", companyId: "c1", role: "CASHIER", allowed: false })]).allowed).toBe(true)
  })

  it("la regla de usuario gana a todas, y solo aplica a ese usuario", () => {
    const company = rule({ scope: "COMPANY", companyId: "c1", allowed: false, module: "/pos" })
    const user = rule({ scope: "USER", role: null, userId: "u1", allowed: true, module: "/pos" })
    expect(resolveAccess(as("CASHIER"), "/pos", [company, user])).toEqual({ allowed: true, source: "user" })
    expect(resolveAccess(as("CASHIER", { userId: "u2" }), "/pos", [company, user])).toEqual({ allowed: false, source: "company" })
  })

  it("una regla de otro módulo no afecta", () => {
    expect(resolveAccess(as("CASHIER"), "/reports", [rule({ module: "/inventory" })]).allowed).toBe(false)
  })

  it("una empresa sin id no recibe reglas de empresa", () => {
    const r = rule({ scope: "COMPANY", companyId: "c1" })
    expect(resolveAccess(as("CASHIER", { companyId: null }), "/reports", [r]).allowed).toBe(false)
  })
})

describe("módulos protegidos", () => {
  it("los de plataforma nunca se conceden, ni con reglas de usuario", () => {
    expect(PLATFORM_MODULES).toEqual(expect.arrayContaining(["/god-dashboard", "/companies", "/audit-log", "/invites"]))
    for (const mod of PLATFORM_MODULES) {
      for (const scope of ["GLOBAL", "COMPANY", "USER"] as const) {
        const r = rule({ scope, module: mod, companyId: scope === "COMPANY" ? "c1" : null, userId: scope === "USER" ? "u1" : null, role: scope === "USER" ? null : "ADMIN" })
        expect(resolveAccess(as("ADMIN"), mod, [r]).allowed, `${scope} ${mod}`).toBe(false)
      }
    }
  })

  it("al dueño nunca se le quitan Usuarios ni Configuración", () => {
    for (const mod of OWNER_LOCKED_MODULES) {
      const deny = [rule({ role: "OWNER", module: mod, allowed: false }), rule({ scope: "USER", role: null, userId: "u1", module: mod, allowed: false })]
      expect(resolveAccess(as("OWNER"), mod, deny)).toEqual({ allowed: true, source: "owner" })
    }
    // Pero a un administrador sí se le pueden quitar
    expect(resolveAccess(as("ADMIN"), "/users", [rule({ role: "ADMIN", module: "/users", allowed: false })]).allowed).toBe(false)
  })

  it("allowedModules lista lo que la persona puede usar", () => {
    expect(allowedModules(as("CASHIER"), [])).toEqual(expect.arrayContaining(["/pos", "/customers"]))
    expect(allowedModules(as("CASHIER"), [])).not.toContain("/inventory")
    expect(allowedModules(as("CASHIER"), [rule({ module: "/inventory" })])).toContain("/inventory")
  })
})

describe("claves y validación de reglas", () => {
  it("subjectKey identifica a quién aplica la regla", () => {
    expect(subjectKey({ scope: "GLOBAL", role: "CASHIER", companyId: null, userId: null })).toBe("GLOBAL:CASHIER")
    expect(subjectKey({ scope: "COMPANY", role: "CASHIER", companyId: "c1", userId: null })).toBe("COMPANY:c1:CASHIER")
    expect(subjectKey({ scope: "USER", role: null, companyId: null, userId: "u1" })).toBe("USER:u1")
  })

  it("acepta reglas bien formadas", () => {
    expect(validateRule(rule({}))).toBeNull()
    expect(validateRule(rule({ scope: "COMPANY", companyId: "c1" }))).toBeNull()
    expect(validateRule(rule({ scope: "USER", role: null, userId: "u1" }))).toBeNull()
  })

  it("rechaza reglas mal formadas o peligrosas", () => {
    const bad: [string, PermissionRuleData][] = [
      ["módulo desconocido", rule({ module: "/no-existe" })],
      ["global sin rol", rule({ role: null })],
      ["global con empresa", rule({ companyId: "c1" })],
      ["empresa sin empresa", rule({ scope: "COMPANY" })],
      ["usuario sin usuario", rule({ scope: "USER", role: null })],
      ["usuario con rol", rule({ scope: "USER", userId: "u1" })],
      ["regla para el GOD", rule({ role: "GOD" })],
      ["conceder plataforma", rule({ module: "/companies", allowed: true })],
      ["quitar Usuarios al dueño", rule({ role: "OWNER", module: "/users", allowed: false })],
    ]
    for (const [name, r] of bad) expect(validateRule(r), name).not.toBeNull()
  })
})
