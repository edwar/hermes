import { describe, expect, it } from "vitest"
import { ALL_ROLES, canAccess, NAV_ACCESS, rolesFor } from "@/lib/navigation"
import { guideSlugForPath, guidesFor, GUIDE_VIDEOS, groupBySection, isRestricted, rolesOf } from "@/lib/guide/content"

/** Lo que mostraba la barra lateral ANTES de centralizar los roles (regresión: no debe cambiar). */
const SIDEBAR_BEFORE: Record<string, string[]> = {
  "/dashboard": ["OWNER", "ADMIN", "MANAGER", "CASHIER"],
  "/pos": ["OWNER", "ADMIN", "CASHIER"],
  "/sales": ["OWNER", "ADMIN", "CASHIER"],
  "/electronic-invoices": ["OWNER", "ADMIN", "MANAGER", "CASHIER"],
  "/inventory": ["OWNER", "ADMIN", "MANAGER"],
  "/categories": ["OWNER", "ADMIN", "MANAGER"],
  "/reports": ["OWNER", "ADMIN", "MANAGER"],
  "/customers": ["OWNER", "ADMIN", "CASHIER"],
  "/suppliers": ["OWNER", "ADMIN"],
  "/purchase-orders": ["OWNER", "ADMIN", "MANAGER"],
  "/cajas": ["OWNER", "ADMIN"],
  "/settings": ["OWNER", "ADMIN"],
  "/god-dashboard": ["GOD"],
  "/system-settings": ["GOD"],
  "/factus/transactions": ["GOD"],
  "/audit-log": ["GOD"],
  "/notifications": ["GOD", "OWNER", "ADMIN"],
  "/users": ["OWNER", "ADMIN"],
  "/invites": ["GOD"],
  "/companies": ["GOD"],
}

describe("acceso por módulo (lib/navigation)", () => {
  it("no cambia lo que cada rol veía en el menú", () => {
    for (const [href, roles] of Object.entries(SIDEBAR_BEFORE)) {
      expect([...rolesFor(href)].sort(), href).toEqual([...roles].sort())
    }
  })

  it("canAccess responde por rol y rechaza roles vacíos o desconocidos", () => {
    expect(canAccess("/pos", "CASHIER")).toBe(true)
    expect(canAccess("/users", "CASHIER")).toBe(false)
    expect(canAccess("/audit-log", "ADMIN")).toBe(false)
    expect(canAccess("/pos", null)).toBe(false)
    expect(canAccess("/pos", undefined)).toBe(false)
    expect(canAccess("/pos", "HACKER")).toBe(false)
    expect(canAccess("/no-existe", "OWNER")).toBe(false)
  })

  it("las rutas que no están en el menú heredan el acceso de su módulo", () => {
    expect([...rolesFor("/stock-movements")]).toEqual([...rolesFor("/inventory")])
    expect(ALL_ROLES.every((r) => canAccess("/profile", r))).toBe(true)
  })
})

describe("guía por rol", () => {
  const slugs = (role: string | null) => guidesFor(role).map((v) => v.slug)

  it("el administrador de plataforma ve todos los videos", () => {
    expect(guidesFor("GOD")).toHaveLength(GUIDE_VIDEOS.length)
  })

  it("el cajero solo ve lo que puede usar", () => {
    const visible = guidesFor("CASHIER")
    expect(visible.length).toBeGreaterThan(0)
    for (const v of visible) {
      expect((rolesOf(v) as readonly string[]).includes("CASHIER"), v.slug).toBe(true)
      expect(v.section).not.toBe("PLATAFORMA")
    }
    expect(slugs("CASHIER")).toContain("vender-y-cobrar")
  })

  it("nadie ve un video de un módulo que no puede abrir", () => {
    for (const role of ALL_ROLES) {
      for (const v of guidesFor(role)) {
        if (role === "GOD") continue
        expect(v.href === null || canAccess(v.href, role), `${role} no debería ver ${v.slug}`).toBe(true)
      }
    }
  })

  it("sin sesión se ve la guía de negocio pero no la de plataforma", () => {
    const visible = guidesFor(null)
    expect(visible.length).toBeGreaterThan(0)
    expect(visible.some((v) => v.section === "PLATAFORMA")).toBe(false)
    expect(guidesFor(undefined)).toEqual(visible)
  })

  it("un rol desconocido no ve nada salvo lo abierto a todos", () => {
    for (const v of guidesFor("HACKER")) expect(v.href, v.slug).toBeNull()
  })

  it("los videos de plataforma son restringidos y solo del GOD", () => {
    for (const v of GUIDE_VIDEOS.filter((x) => x.section === "PLATAFORMA")) {
      expect(isRestricted(v)).toBe(true)
      expect([...rolesOf(v)]).toEqual(["GOD"])
    }
  })

  it("cada href de video existe en la tabla de accesos", () => {
    for (const v of GUIDE_VIDEOS) if (v.href !== null) expect(NAV_ACCESS[v.href], v.slug).toBeDefined()
  })

  it("la ayuda contextual prefiere el video marcado y devuelve null si no hay", () => {
    expect(guideSlugForPath("/pos")).toBe("pantalla-de-venta")
    expect(guideSlugForPath("/no-existe")).toBeNull()
  })

  it("agrupa por sección en el orden definido y omite las vacías", () => {
    const groups = groupBySection(guidesFor("CASHIER"))
    expect(groups.map((g) => g.section)).toEqual([...new Set(groups.map((g) => g.section))])
    for (const g of groups) expect(g.videos.length).toBeGreaterThan(0)
  })
})
