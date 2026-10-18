import { test, expect } from "@playwright/test"
import { GUIDE_VIDEOS, guidesFor } from "../../../lib/guide/content"
import media from "../../../lib/guide/media.json"
import { login } from "../helpers"

const mediaBySlug = media as Record<string, { file?: string }>

async function guideAs(browser: import("@playwright/test").Browser, email: string, password: string) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await login(page, email, password)
  await expect(page).not.toHaveURL(/\/login/)
  await page.goto("/guia")
  return { context, page }
}

test.describe("Guía por rol", () => {
  test("el cajero ve solo las guías de lo que puede usar", async ({ browser }) => {
    const { context, page } = await guideAs(browser, "cajero@hermes.com", "cajero123")
    await expect(page.getByTestId("guide-audience")).toContainText("Cajero")

    const expected = guidesFor("CASHIER")
    await expect(page.locator("video")).toHaveCount(expected.filter((v) => mediaBySlug[v.slug]).length)
    for (const v of GUIDE_VIDEOS) {
      const visible = expected.includes(v)
      await expect(page.locator(`#${v.slug}`), v.slug).toHaveCount(visible && mediaBySlug[v.slug] ? 1 : 0)
    }
    // Nada de administración: ni inventario, ni usuarios, ni plataforma.
    for (const slug of ["inventario", "usuarios"]) await expect(page.locator(`#${slug}`)).toHaveCount(0)
    await context.close()
  })

  test("el administrador de plataforma (GOD) ve todas las guías", async ({ browser }) => {
    const { context, page } = await guideAs(browser, "god@hermes.com", "god123")
    await expect(page.getByTestId("guide-audience")).toContainText("ves todas las guías")
    await expect(page.locator("video")).toHaveCount(GUIDE_VIDEOS.filter((v) => mediaBySlug[v.slug]).length)
    await context.close()
  })

  test("el enlace de ayuda del encabezado abre el video de la pantalla actual", async ({ page }) => {
    await page.goto("/inventory")
    await page.getByRole("link", { name: /guía/i }).first().click()
    await expect(page).toHaveURL(/\/guia#/)
  })
})
