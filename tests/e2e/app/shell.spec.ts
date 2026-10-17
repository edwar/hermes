import { test, expect } from "@playwright/test"

test.describe("Marco de la aplicación", () => {
  test("la barra lateral agrupa las secciones y marca la página actual", async ({ page }) => {
    await page.goto("/dashboard")
    const nav = page.getByRole("navigation", { name: "Secciones" })
    for (const section of ["OPERACIÓN", "CATÁLOGO", "CONTROL"]) {
      await expect(nav.getByText(section, { exact: true })).toBeVisible()
    }
    await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page")
    await expect(nav.getByRole("link", { name: "POS" })).not.toHaveAttribute("aria-current", "page")
  })

  test("navega a cada módulo y el título de la cabecera lo refleja", async ({ page }) => {
    await page.goto("/dashboard")
    const nav = page.getByRole("navigation", { name: "Secciones" })
    const modules: Array<[string, RegExp]> = [
      ["Ventas", /sales$/],
      ["Inventario", /inventory$/],
      ["Clientes", /customers$/],
      ["Proveedores", /suppliers$/],
      ["Compras", /purchase-orders$/],
      ["Cajas", /cajas$/],
      ["Reportes", /reports$/],
      ["Configuración", /settings$/],
    ]
    for (const [label, url] of modules) {
      await nav.getByRole("link", { name: label, exact: true }).click()
      await expect(page, label).toHaveURL(url)
      await expect(page.getByRole("banner").getByRole("heading", { level: 1 })).toBeVisible()
    }
  })

  test("el dashboard resume el turno en una franja de estado", async ({ page }) => {
    await page.goto("/dashboard")
    for (const label of ["Ventas hoy", "Ventas del mes", "Stock bajo", "Productos activos"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByText("Ventas (30 días)")).toBeVisible()
  })

  test("la consola nace oscura y el tema claro se recuerda", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.locator("html")).toHaveClass(/dark/)
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).toBe("rgb(13, 17, 23)") // #0D1117
    await page.getByRole("banner").getByRole("button", { name: /tema|claro|oscuro/i }).click()
    await expect(page.locator("html")).not.toHaveClass(/dark/)
    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(page.locator("html")).not.toHaveClass(/dark/)
    // Se restablece para no afectar otras pruebas
    await page.evaluate(() => localStorage.removeItem("theme"))
    await page.reload()
    await expect(page.locator("html")).toHaveClass(/dark/)
  })

  test("el menú de usuario ofrece perfil y cerrar sesión", async ({ page }) => {
    await page.goto("/dashboard")
    await page.getByRole("banner").getByText("Admin").first().click()
    await expect(page.getByRole("menuitem", { name: "Perfil" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Cerrar sesión" })).toBeVisible()
  })

  test("sigue el enlace de saltar al contenido con el teclado", async ({ page }) => {
    await page.goto("/dashboard")
    await page.keyboard.press("Tab")
    await expect(page.getByRole("link", { name: "Saltar al contenido principal" })).toBeFocused()
  })
})
