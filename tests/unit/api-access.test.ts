import { describe, expect, it } from "vitest"
import type { Session } from "next-auth"
import { canUseModule, denyUnlessModule } from "@/lib/api-access"

const as = (role: string): Session => ({ user: { id: "u1", role, companyId: "c1" }, expires: "" }) as unknown as Session

describe("acceso a módulos en la API", () => {
  it("el GOD puede usar cualquier módulo", () => {
    for (const href of ["/inventory", "/cajas", "/pos", "/customers"]) expect(canUseModule(as("GOD"), href)).toBe(true)
  })

  it("el cajero solo usa lo que el menú le muestra", () => {
    expect(canUseModule(as("CASHIER"), "/pos")).toBe(true)
    expect(canUseModule(as("CASHIER"), "/customers")).toBe(true)
    for (const href of ["/stock-movements", "/categories", "/cajas"]) expect(canUseModule(as("CASHIER"), href)).toBe(false)
  })

  it("el gestor (MANAGER) no abre cajas ni ve clientes", () => {
    expect(canUseModule(as("MANAGER"), "/stock-movements")).toBe(true)
    for (const href of ["/pos", "/cajas", "/customers"]) expect(canUseModule(as("MANAGER"), href)).toBe(false)
  })

  it("responde 401 sin sesión, 403 sin permiso y null si puede seguir", async () => {
    expect(denyUnlessModule(null, "/pos")?.status).toBe(401)
    expect(denyUnlessModule(as("CASHIER"), "/cajas")?.status).toBe(403)
    expect(denyUnlessModule(as("OWNER"), "/cajas")).toBeNull()
  })

  it("un módulo desconocido se niega (salvo al GOD)", () => {
    expect(canUseModule(as("OWNER"), "/no-existe")).toBe(false)
    expect(canUseModule(as("GOD"), "/no-existe")).toBe(true)
  })
})
