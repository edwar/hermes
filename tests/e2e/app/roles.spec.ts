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

  test("el cajero no puede llamar a rutas de módulos que el menú le oculta", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "cajero@hermes.com", "cajero123")
    await expect(page).toHaveURL(/\/dashboard/)

    const api = context.request
    expect((await api.get("/api/stock-movements")).status()).toBe(403)
    expect((await api.post("/api/stock-movements", { data: { type: "IN", quantity: 1, reason: "x", productId: "x" } })).status()).toBe(403)
    expect((await api.get("/api/categories")).status()).toBe(403)
    expect((await api.post("/api/categories", { data: { name: "Hackeada" } })).status()).toBe(403)
    expect((await api.get("/api/cash-sessions")).status()).toBe(403)
    expect((await api.get("/api/cash-sessions/no-existe/report")).status()).toBe(403)

    // Lo que sí necesita para vender sigue funcionando.
    expect((await api.get("/api/customers")).status()).toBe(200)
    expect((await api.get("/api/cash-sessions/active")).status()).toBe(200)
    expect((await api.get("/api/dashboard")).status()).toBe(200)
    await context.close()
  })

  test("el administrador sigue usando esas mismas rutas", async ({ request }) => {
    for (const url of ["/api/stock-movements", "/api/categories", "/api/cash-sessions", "/api/customers"]) {
      expect((await request.get(url)).status(), url).toBe(200)
    }
  })
})
