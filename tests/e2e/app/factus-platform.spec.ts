import { test, expect, type Browser } from "@playwright/test"
import { login } from "../helpers"

async function asGod(browser: Browser) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await login(page, "god@hermes.com", "god123")
  await expect(page).not.toHaveURL(/\/login/)
  return { context, page }
}

test.describe("Factus de la plataforma (solo GOD)", () => {
  test("el administrador de una empresa no puede ver ni cambiar la configuración", async ({ request }) => {
    expect((await request.get("/api/god/factus-config")).status()).toBe(403)
    expect((await request.put("/api/god/factus-config", { data: { apiUrl: "https://api.factus.com.co" } })).status()).toBe(403)
    expect((await request.post("/api/god/factus-config")).status()).toBe(403)
  })

  test("el GOD ve la configuración sin ningún secreto y la API valida lo que recibe", async ({ browser }) => {
    const { context } = await asGod(browser)
    const api = context.request

    const res = await api.get("/api/god/factus-config")
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).not.toMatch(/secret|password|Enc/i)
    const json = JSON.parse(text)
    expect(json.apiUrl).toMatch(/^https:\/\/.*factus\.com\.co$/)

    for (const bad of ["http://api.factus.com.co", "https://evil.com", "https://api.factus.com.co/v2"]) {
      const r = await api.put("/api/god/factus-config", { data: { apiUrl: bad } })
      expect(r.status(), bad).toBe(400)
    }
    const incomplete = await api.put("/api/god/factus-config", { data: { credentials: { clientId: "solo-uno" } } })
    expect(incomplete.status()).toBe(400)
    expect((await api.put("/api/god/factus-config", { data: {} })).status()).toBe(400)
    await context.close()
  })

  test("la pantalla de configuración del sistema muestra la URL y guarda solo si cambia", async ({ browser }) => {
    const { context, page } = await asGod(browser)
    await page.goto("/system-settings")
    await expect(page.getByText("Factus de la plataforma")).toBeVisible()

    const url = page.getByLabel("URL de la API")
    await expect(url).toHaveValue(/factus\.com\.co$/)
    const save = page.getByRole("button", { name: "Guardar URL" })
    await expect(save).toBeDisabled()
    await page.getByRole("button", { name: "Producción", exact: true }).click()
    await expect(url).toHaveValue("https://api.factus.com.co")
    await expect(save).toBeEnabled()

    // Los secretos son campos de contraseña y no se rellenan.
    await expect(page.getByLabel("Client Secret")).toHaveAttribute("type", "password")
    await expect(page.getByLabel("Contraseña")).toHaveAttribute("type", "password")
    await expect(page.getByLabel("Client Secret")).toHaveValue("")
    await context.close()
  })
})
