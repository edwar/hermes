import { test, expect } from "@playwright/test"
import { login } from "../helpers"

test.describe("Panel del administrador de plataforma", () => {
  test("el menú del GOD solo trae Plataforma y Notificaciones, sin las pantallas de empresa", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "god@hermes.com", "god123")
    await expect(page).not.toHaveURL(/\/login/)
    await page.goto("/god-dashboard")

    const nav = page.getByRole("navigation", { name: "Secciones" })
    for (const link of ["Panel GOD", "Config. Sistema", "Transacciones Factus", "Auditoría", "Invitaciones", "Empresas", "Notificaciones"]) {
      await expect(nav.getByRole("link", { name: link, exact: true }), link).toBeVisible()
    }
    // Sin empresa no tienen datos y lo devolverían al panel
    for (const link of ["Dashboard", "POS", "Ventas", "Inventario", "Clientes", "Cajas", "Configuración", "Usuarios", "Reportes"]) {
      await expect(nav.getByRole("link", { name: link, exact: true }), link).toHaveCount(0)
    }
    await context.close()
  })

  test("sin empresas, la tabla lo dice en vez de quedar vacía", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "god@hermes.com", "god123")
    await expect(page).not.toHaveURL(/\/login/)
    await page.route("**/api/companies", (route) => route.fulfill({ json: [] }))
    await page.goto("/god-dashboard")
    await expect(page.getByText("Aún no hay empresas registradas")).toBeVisible()
    await context.close()
  })
})
