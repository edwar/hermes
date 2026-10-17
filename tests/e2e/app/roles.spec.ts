import { test, expect } from "@playwright/test"
import { login } from "../helpers"

test.describe("Permisos por rol", () => {
  test("el cajero solo ve lo que necesita para vender", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "cajero@hermes.com", "cajero123")
    await expect(page).toHaveURL(/\/dashboard/)

    const nav = page.getByRole("navigation", { name: "Secciones" })
    for (const visible of ["Dashboard", "POS", "Ventas", "Clientes"]) {
      await expect(nav.getByRole("link", { name: visible, exact: true })).toBeVisible()
    }
    for (const hidden of ["Usuarios", "Configuración", "Inventario", "Proveedores", "Cajas"]) {
      await expect(nav.getByRole("link", { name: hidden, exact: true }), `${hidden} no debe verse`).toHaveCount(0)
    }
    await context.close()
  })

  test("el cajero no puede cambiar credenciales de Factus ni reintentar facturas de la empresa", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "cajero@hermes.com", "cajero123")
    await expect(page).toHaveURL(/\/dashboard/)

    const put = await context.request.put("/api/factus/settings", {
      data: { credentials: { clientId: "a", clientSecret: "b", username: "c", password: "d" } },
    })
    expect(put.status()).toBe(403)
    const retry = await context.request.post("/api/invoicing/retry")
    expect(retry.status()).toBe(403)
    await context.close()
  })
})
