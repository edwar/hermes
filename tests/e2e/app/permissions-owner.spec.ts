import { test, expect, type Browser } from "@playwright/test"
import { login } from "../helpers"
import { ensureOwner, OWNER, removeOwner } from "../owner-fixture"

async function as(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await login(page, email, password)
  await expect(page).not.toHaveURL(/\/login/)
  return { context, page }
}

test.describe("Permisos del equipo (solo el dueño)", () => {
  test.describe.configure({ mode: "serial" })
  test.beforeAll(async () => { await ensureOwner() })
  test.afterAll(async () => { await removeOwner() })

  test("quien no es dueño no puede administrar permisos, y el GOD usa su propia pantalla", async ({ request, browser }) => {
    // Administrador de la empresa
    expect((await request.get("/api/permissions")).status()).toBe(403)
    expect((await request.put("/api/permissions", { data: { role: "CASHIER", module: "/inventory", allowed: true } })).status()).toBe(403)
    // Cajero
    const cashier = await as(browser, "cajero@hermes.com", "cajero123")
    expect((await cashier.context.request.get("/api/permissions")).status()).toBe(403)
    await cashier.context.close()
    // GOD: no tiene empresa; se le indica dónde configurar
    const god = await as(browser, "god@hermes.com", "god123")
    expect((await god.context.request.get("/api/permissions")).status()).toBe(400)
    await god.context.close()
  })

  test("el dueño configura a su equipo, pero no a sí mismo ni lo que es de la plataforma", async ({ browser }) => {
    test.setTimeout(180_000)
    const owner = await as(browser, OWNER.email, OWNER.password)
    const api = owner.context.request
    const cashier = await as(browser, "cajero@hermes.com", "cajero123")
    const put = (data: Record<string, unknown>) => api.put("/api/permissions", { data })
    try {
      // La matriz no incluye su propio rol ni módulos de plataforma
      const matrix = await (await api.get("/api/permissions")).json()
      expect(matrix.roles).toEqual(["ADMIN", "MANAGER", "CASHIER"])
      const modules = matrix.modules.map((m: { module: string }) => m.module)
      for (const hidden of ["/god-dashboard", "/companies", "/permissions", "/profile"]) expect(modules).not.toContain(hidden)

      // Lo que no puede hacer
      expect((await put({ role: "OWNER", module: "/inventory", allowed: false })).status()).toBe(400)
      expect((await put({ role: "GOD", module: "/inventory", allowed: true })).status()).toBe(400)
      expect((await put({ role: "CASHIER", module: "/god-dashboard", allowed: true })).status()).toBe(400)
      expect((await put({ role: "CASHIER", module: "/permissions", allowed: true })).status()).toBe(400)
      expect((await api.delete("/api/permissions?role=OWNER")).status()).toBe(400)

      // Rol: su cajero gana Inventario (sin tope) y lo pierde al restablecer
      await cashier.page.goto("/inventory")
      await expect(cashier.page).toHaveURL(/\/dashboard/)
      const set = await put({ role: "CASHIER", module: "/inventory", allowed: true })
      expect(set.status()).toBe(200)
      expect((await set.json()).matrix.cells.CASHIER["/inventory"]).toMatchObject({ allowed: true, source: "company", overridden: true })
      await cashier.page.goto("/inventory")
      await expect(cashier.page).toHaveURL(/\/inventory/)
      expect((await api.delete("/api/permissions?role=CASHIER")).status()).toBe(200)
      await cashier.page.goto("/inventory")
      await expect(cashier.page).toHaveURL(/\/dashboard/)

      // Persona: solo de su empresa y nunca un dueño
      const team = (await (await api.get("/api/users")).json()) as { id: string; email: string; role: string }[]
      const cashierUser = team.find((u) => u.email === "cajero@hermes.com")!
      const ownerUser = team.find((u) => u.email === OWNER.email)!
      expect((await put({ userId: ownerUser.id, module: "/inventory", allowed: false })).status()).toBe(400)
      expect((await put({ userId: "no-existe", module: "/reports", allowed: true })).status()).toBe(400)
      expect((await api.get("/api/permissions?userId=no-existe")).status()).toBe(404)
      const own = await put({ userId: cashierUser.id, module: "/reports", allowed: true })
      expect(own.status()).toBe(200)
      expect((await own.json()).matrix.cells["/reports"]).toMatchObject({ allowed: true, source: "user" })
      await cashier.page.goto("/reports")
      await expect(cashier.page).toHaveURL(/\/reports/)
    } finally {
      await api.delete("/api/permissions?role=CASHIER")
      const team = (await (await api.get("/api/users")).json()) as { id: string; email: string }[]
      const c = team.find((u) => u.email === "cajero@hermes.com")
      if (c) await api.delete(`/api/permissions?userId=${c.id}`)
    }
    await cashier.page.goto("/reports")
    await expect(cashier.page).toHaveURL(/\/dashboard/)

    // Todo queda en Auditoría de la empresa del dueño... y el administrador no ve la tarjeta
    await cashier.context.close()
    await owner.context.close()
  })

  test("la tarjeta Permisos del equipo la ve el dueño en Configuración, y no el administrador", async ({ browser, page }) => {
    test.setTimeout(150_000)
    // Administrador (la sesión por defecto de este proyecto)
    await page.goto("/settings")
    await expect(page.getByText("Datos de la empresa que aparecen en los tickets")).toBeVisible()
    // La tarjeta de Factus carga después: cuando está, la página ya terminó de dibujarse
    await expect(page.getByText("Facturación Electrónica (Factus)")).toBeVisible()
    await expect(page.getByText("Permisos del equipo")).toHaveCount(0)

    const owner = await as(browser, OWNER.email, OWNER.password)
    try {
      await owner.page.goto("/settings")
      await expect(owner.page.getByText("Permisos del equipo")).toBeVisible()
      const toggle = owner.page.getByRole("switch", { name: "Inventario para Cajero" })
      await expect(toggle).not.toBeChecked()
      await toggle.click()
      await expect(toggle).toBeChecked()
      await owner.page.getByRole("button", { name: /Restablecer \(1\)/ }).click()
      await owner.page.getByRole("button", { name: "Restablecer", exact: true }).click()
      await expect(toggle).not.toBeChecked()
    } finally {
      await owner.context.request.delete("/api/permissions?role=CASHIER")
    }
    await owner.context.close()
  })
  test("las pantallas muestran lo que el módulo de cada pestaña permite, no un rol fijo", async ({ browser, page }) => {
    test.setTimeout(150_000)
    // Administrador: Inventario con sus dos pestañas
    await page.goto("/inventory")
    await expect(page.getByRole("tab", { name: "Movimientos" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Productos" })).toBeVisible()

    // Un cajero al que el dueño le da Inventario ve los productos, pero no el historial de movimientos
    const owner = await as(browser, OWNER.email, OWNER.password)
    const cashier = await as(browser, "cajero@hermes.com", "cajero123")
    try {
      expect((await owner.context.request.put("/api/permissions", { data: { role: "CASHIER", module: "/inventory", allowed: true } })).status()).toBe(200)
      await cashier.page.goto("/inventory")
      await expect(cashier.page).toHaveURL(/\/inventory/)
      await expect(cashier.page.getByRole("button", { name: /Agregar Producto/ })).toBeVisible()
      await expect(cashier.page.getByRole("tab", { name: "Movimientos" })).toHaveCount(0)
    } finally {
      await owner.context.request.delete("/api/permissions?role=CASHIER")
    }
    await cashier.context.close()
    await owner.context.close()
  })
  test("la guía del dueño trae Permisos del equipo y la del administrador no", async ({ browser, page }) => {
    // Administrador (la sesión por defecto de este proyecto)
    await page.goto("/guia")
    await expect(page.getByTestId("guide-audience")).toContainText("Gerente")
    await expect(page.locator("#permisos-del-equipo")).toHaveCount(0)

    const owner = await as(browser, OWNER.email, OWNER.password)
    await owner.page.goto("/guia")
    await expect(owner.page.getByTestId("guide-audience")).toContainText("Dueño")
    await expect(owner.page.locator("#permisos-del-equipo")).toHaveCount(1)
    await owner.context.close()
  })
})
