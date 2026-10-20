import { test, expect } from "@playwright/test"
import { login } from "../helpers"

test.describe("Documento interno: primer cliente", () => {
  test("el administrador de una empresa no puede abrirlo", async ({ page }) => {
    await page.goto("/primer-cliente")
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test("el GOD lo abre escribiendo la dirección, no está en el menú y las casillas se recuerdan", async ({ browser }) => {
    test.setTimeout(120_000)
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "god@hermes.com", "god123")
    await expect(page).not.toHaveURL(/\/login/)

    // Sin enlace en el menú
    await page.goto("/god-dashboard")
    await expect(page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: /Primer cliente/ })).toHaveCount(0)

    await page.goto("/primer-cliente")
    await expect(page.getByRole("heading", { level: 1, name: "Primer cliente: listado de verificación" })).toBeVisible()
    const progress = page.getByTestId("doc-progress")
    await expect(progress).toContainText(/^0 de \d+ verificados$/)
    const total = Number(/de (\d+)/.exec((await progress.textContent()) ?? "")?.[1])
    expect(total).toBeGreaterThanOrEqual(25)

    // Marcar una casilla y que siga marcada al recargar
    await page.getByRole("checkbox").first().click()
    await expect(progress).toHaveText(`1 de ${total} verificados`)
    await page.reload()
    await expect(page.getByTestId("doc-progress")).toHaveText(`1 de ${total} verificados`)

    await page.getByRole("button", { name: "Desmarcar todo" }).click()
    await expect(page.getByTestId("doc-progress")).toHaveText(`0 de ${total} verificados`)
    await context.close()
  })
})
