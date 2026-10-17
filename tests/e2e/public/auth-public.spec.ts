import { test, expect } from "@playwright/test"
import { login } from "../helpers"

test.describe("Acceso", () => {
  test("rutas protegidas redirigen al login sin sesión", async ({ page }) => {
    for (const path of ["/dashboard", "/pos", "/inventory", "/settings"]) {
      await page.goto(path)
      await expect(page, `${path} debe exigir sesión`).toHaveURL(/\/login/)
    }
  })

  test("credenciales inválidas muestran un error y no entran", async ({ page }) => {
    await login(page, "nadie@hermes.com", "incorrecta")
    await expect(page.getByText(/Credenciales inválidas/)).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test("el formulario exige correo y contraseña", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("button", { name: "Iniciar sesión" }).click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator("#email")).toHaveJSProperty("validity.valueMissing", true)
  })

  test("se puede mostrar y ocultar la contraseña", async ({ page }) => {
    await page.goto("/login")
    const password = page.locator("#password")
    await password.fill("secreta")
    await expect(password).toHaveAttribute("type", "password")
    await page.getByRole("button", { name: "Mostrar contraseña" }).click()
    await expect(password).toHaveAttribute("type", "text")
  })

  test("el login muestra el ticket de ejemplo en escritorio", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "El panel lateral solo existe en pantallas grandes")
    await page.goto("/login")
    await expect(page.getByRole("figure", { name: /ejemplo de ticket/i })).toBeVisible()
  })
})

test.describe("API sin autenticación", () => {
  test("el cron de reintentos exige el secreto", async ({ request }) => {
    expect((await request.get("/api/invoicing/retry")).status()).toBe(401)
    const bad = await request.get("/api/invoicing/retry", { headers: { authorization: "Bearer incorrecto" } })
    expect(bad.status()).toBe(401)
    const post = await request.post("/api/invoicing/retry")
    expect(post.status()).toBe(401)
  })

  test("las rutas de Factus no responden sin sesión", async ({ request }) => {
    for (const path of ["/api/factus/settings", "/api/factus/status", "/api/factus/credits", "/api/factus/invoices"]) {
      const res = await request.get(path)
      expect([401, 403, 307], `${path} no debe ser público`).toContain(res.status())
    }
  })

  test("las credenciales no se pueden guardar sin sesión", async ({ request }) => {
    const res = await request.put("/api/factus/settings", {
      data: { credentials: { clientId: "a", clientSecret: "b", username: "c", password: "d" } },
    })
    expect([401, 403, 307]).toContain(res.status())
  })
})
