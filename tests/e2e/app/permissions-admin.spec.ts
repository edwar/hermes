import { test, expect, type Browser } from "@playwright/test"
import { login } from "../helpers"

async function as(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await login(page, email, password)
  await expect(page).not.toHaveURL(/\/login/)
  return { context, page }
}

test.describe("Permisos por rol (solo GOD)", () => {
  test.describe.configure({ mode: "serial" })

  test("el administrador de una empresa no puede ver ni cambiar los permisos", async ({ request }) => {
    expect((await request.get("/api/god/permissions")).status()).toBe(403)
    expect((await request.put("/api/god/permissions", { data: { role: "CASHIER", module: "/reports", allowed: true } })).status()).toBe(403)
    expect((await request.delete("/api/god/permissions?role=CASHIER")).status()).toBe(403)
  })

  test("la API valida lo que recibe", async ({ browser }) => {
    const god = await as(browser, "god@hermes.com", "god123")
    const put = (data: Record<string, unknown>) => god.context.request.put("/api/god/permissions", { data })
    expect((await put({ role: "GOD", module: "/reports", allowed: true })).status()).toBe(400)
    expect((await put({ role: "CASHIER", module: "/god-dashboard", allowed: true })).status()).toBe(400) // plataforma
    expect((await put({ role: "CASHIER", module: "/no-existe", allowed: true })).status()).toBe(400)
    expect((await put({ role: "OWNER", module: "/users", allowed: false })).status()).toBe(400) // fijo del dueño
    expect((await put({ role: "CASHIER", module: "/profile", allowed: false })).status()).toBe(400)
    expect((await put({ role: "CASHIER", module: "/reports", allowed: "si" })).status()).toBe(400)
    expect((await put({ role: "CASHIER", module: "/reports", allowed: true, companyId: "no-existe" })).status()).toBe(400)
    expect((await god.context.request.delete("/api/god/permissions?role=GOD")).status()).toBe(400)
    await god.context.close()
  })

  test("un cambio global y uno de empresa se aplican en segundos, y se pueden deshacer", async ({ browser }) => {
    test.setTimeout(150_000)
    const god = await as(browser, "god@hermes.com", "god123")
    const api = god.context.request
    const cashier = await as(browser, "cajero@hermes.com", "cajero123")
    try {
      // Global: el cajero gana Reportes
      await cashier.page.goto("/reports")
      await expect(cashier.page).toHaveURL(/\/dashboard/)
      const set = await api.put("/api/god/permissions", { data: { role: "CASHIER", module: "/reports", allowed: true } })
      expect(set.status()).toBe(200)
      expect((await set.json()).matrix.cells.CASHIER["/reports"]).toMatchObject({ allowed: true, source: "global", overridden: true })
      await cashier.page.goto("/reports")
      await expect(cashier.page).toHaveURL(/\/reports/)
      expect((await cashier.context.request.get("/api/exports/sales")).status()).toBe(200)

      // Empresa: a esa empresa se le quita el POS al cajero (gana sobre lo global/por defecto)
      const deny = await api.put("/api/god/permissions", { data: { companyId: "default-company", role: "CASHIER", module: "/pos", allowed: false } })
      expect(deny.status()).toBe(200)
      await cashier.page.goto("/pos")
      await expect(cashier.page).toHaveURL(/\/dashboard/)
      // Poner el mismo valor que se hereda quita la regla en vez de guardarla
      const back = await api.put("/api/god/permissions", { data: { companyId: "default-company", role: "CASHIER", module: "/pos", allowed: true } })
      expect((await back.json()).matrix.cells.CASHIER["/pos"]).toMatchObject({ allowed: true, overridden: false })
      await cashier.page.goto("/pos")
      await expect(cashier.page).toHaveURL(/\/pos/)

      // Todo queda en Auditoría
      const audit = await (await api.get("/api/audit-log?action=PERMISSION_RULE_CHANGED")).text()
      expect(audit).toContain("PERMISSION_RULE_CHANGED")
    } finally {
      await api.delete("/api/god/permissions?role=CASHIER")
      await api.delete("/api/god/permissions?role=CASHIER&companyId=default-company")
    }
    await cashier.page.goto("/reports")
    await expect(cashier.page).toHaveURL(/\/dashboard/)
    await cashier.context.close()
    await god.context.close()
  })

  test("la pantalla de Configuración del Sistema permite cambiar y restablecer", async ({ browser }) => {
    test.setTimeout(150_000)
    const god = await as(browser, "god@hermes.com", "god123")
    const { page } = god
    try {
      await page.goto("/system-settings")
      await expect(page.getByText("Permisos por rol")).toBeVisible()
      const toggle = page.getByRole("switch", { name: "Reportes para Cajero" })
      await expect(toggle).not.toBeChecked()
      await toggle.click()
      await expect(toggle).toBeChecked()
      // El dueño no pierde Usuarios ni Configuración
      await expect(page.getByRole("switch", { name: "Usuarios para Dueño" })).toBeDisabled()

      await page.getByRole("button", { name: /Restablecer \(1\)/ }).click()
      await page.getByRole("button", { name: "Restablecer", exact: true }).click()
      await expect(toggle).not.toBeChecked()
    } finally {
      await god.context.request.delete("/api/god/permissions?role=CASHIER")
    }
    await god.context.close()
  })
})
