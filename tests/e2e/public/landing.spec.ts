import { test, expect } from "@playwright/test"

test.describe("Landing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("muestra la oferta y el POS de ejemplo en el primer viewport", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("gratis")
    await expect(page.getByRole("link", { name: "Comenzar gratis" })).toBeVisible()
    const preview = page.getByRole("figure", { name: /ejemplo del punto de venta/i })
    await expect(preview).toBeVisible()
    await expect(preview.getByText("EJEMPLO")).toBeVisible()
    await expect(preview.getByText("$ 23.576")).toBeVisible()
  })

  test("el menú lleva a las secciones", async ({ page }) => {
    await page.getByRole("link", { name: "Precios" }).first().click()
    await expect(page).toHaveURL(/#pricing$/)
    await expect(page.getByRole("heading", { name: "Sin costos ocultos" })).toBeInViewport()
  })

  test("los precios solo prometen lo verificable", async ({ page }) => {
    const pricing = page.locator("#pricing")
    await expect(pricing.getByText("Siempre gratis")).toBeVisible()
    await expect(pricing.getByText("Para activar la facturación electrónica")).toBeVisible()
    await expect(pricing.getByText(/certificado de\s+firma digital de tu empresa/i)).toBeVisible()
    // Promesas retiradas porque no podemos sostenerlas
    await expect(page.getByText("Firma digital incluida")).toHaveCount(0)
    await expect(page.getByText("Soporte técnico prioritario")).toHaveCount(0)
  })

  test("los botones de contacto abren WhatsApp", async ({ page }) => {
    const cta = page.getByRole("link", { name: "Comenzar gratis" })
    await expect(cta).toHaveAttribute("href", /wa\.me\//)
    await expect(cta).toHaveAttribute("target", "_blank")
  })

  test("no hay desbordamiento horizontal", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test("el tema alterna y se recuerda", async ({ page }) => {
    await expect(page.locator("html")).toHaveClass(/dark/)
    await page.getByRole("button", { name: /tema|claro|oscuro/i }).first().click()
    await expect(page.locator("html")).not.toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator("html")).not.toHaveClass(/dark/)
  })
})
