import { describe, expect, it } from "vitest"
import { canAssignRole, canManageUser, selfChangeError, ASSIGNABLE_ROLES } from "@/lib/permissions/user-management"

describe("qué roles se pueden asignar", () => {
  it("nadie puede asignar GOD, ni roles inventados", () => {
    for (const actor of ["GOD", "OWNER", "ADMIN", "MANAGER", "CASHIER", null]) {
      expect(canAssignRole(actor, "GOD"), `${actor} → GOD`).toBe(false)
      expect(canAssignRole(actor, "SUPERUSER"), `${actor} → SUPERUSER`).toBe(false)
    }
  })

  it("el dueño y el GOD asignan cualquier rol de empresa", () => {
    for (const role of ASSIGNABLE_ROLES) {
      expect(canAssignRole("OWNER", role)).toBe(true)
      expect(canAssignRole("GOD", role)).toBe(true)
    }
  })

  it("el administrador solo asigna Gestor y Cajero; gestor y cajero no asignan nada", () => {
    expect(canAssignRole("ADMIN", "MANAGER")).toBe(true)
    expect(canAssignRole("ADMIN", "CASHIER")).toBe(true)
    expect(canAssignRole("ADMIN", "ADMIN")).toBe(false)
    expect(canAssignRole("ADMIN", "OWNER")).toBe(false)
    for (const role of ASSIGNABLE_ROLES) {
      expect(canAssignRole("MANAGER", role)).toBe(false)
      expect(canAssignRole("CASHIER", role)).toBe(false)
    }
  })
})

describe("a quién se puede modificar", () => {
  const user = (id: string, role: string) => ({ id, role })

  it("al GOD no lo modifica nadie desde la aplicación", () => {
    for (const actor of ["GOD", "OWNER", "ADMIN"]) {
      expect(canManageUser({ id: "a", role: actor }, user("g", "GOD"))).toBe(false)
    }
  })

  it("el administrador no toca al dueño ni a otros administradores, pero sí a su equipo y a sí mismo", () => {
    const admin = { id: "a1", role: "ADMIN" }
    expect(canManageUser(admin, user("o", "OWNER"))).toBe(false)
    expect(canManageUser(admin, user("a2", "ADMIN"))).toBe(false)
    expect(canManageUser(admin, user("m", "MANAGER"))).toBe(true)
    expect(canManageUser(admin, user("c", "CASHIER"))).toBe(true)
    expect(canManageUser(admin, user("a1", "ADMIN"))).toBe(true)
  })

  it("el dueño modifica a cualquiera de su empresa; gestor y cajero a nadie", () => {
    for (const role of ASSIGNABLE_ROLES) expect(canManageUser({ id: "o", role: "OWNER" }, user("x", role))).toBe(true)
    for (const actor of ["MANAGER", "CASHIER"]) expect(canManageUser({ id: "z", role: actor }, user("x", "CASHIER"))).toBe(false)
  })
})

describe("cambios sobre uno mismo", () => {
  it("no puedes cambiar tu rol ni desactivarte, pero sí tu nombre o contraseña", () => {
    expect(selfChangeError("a", "a", { role: "OWNER" }, "ADMIN")).not.toBeNull()
    expect(selfChangeError("a", "a", { isActive: false }, "ADMIN")).not.toBeNull()
    expect(selfChangeError("a", "a", { role: "ADMIN" }, "ADMIN")).toBeNull()
    expect(selfChangeError("a", "a", { isActive: true }, "ADMIN")).toBeNull()
    expect(selfChangeError("a", "b", { role: "OWNER", isActive: false }, "CASHIER")).toBeNull()
  })
})
