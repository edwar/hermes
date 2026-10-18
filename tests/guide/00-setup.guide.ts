import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { test, expect } from "@playwright/test"
import { AUTH_FILES } from "./lib/recorder"
import { CUSTOMER, WEIGHT_PRODUCT, cleanDemoData } from "./lib/fixtures"

/**
 * Prepara la base de pruebas y guarda las sesiones con las que se graba. Corre siempre primero:
 *   pnpm guide:record --grep "00|vender-y-cobrar"
 */
test("00 preparación (sin grabar)", async ({ page, browser }) => {
  mkdirSync(dirname(AUTH_FILES.admin), { recursive: true })

  // Sesión del administrador de la empresa
  await page.goto("/login")
  await page.waitForLoadState("networkidle")
  await page.locator("#email").fill(process.env.E2E_ADMIN_EMAIL ?? "admin@hermes.com")
  await page.locator("#password").fill(process.env.E2E_ADMIN_PASSWORD ?? "admin123")
  await page.getByRole("button", { name: "Iniciar sesión" }).click()
  await expect(page).toHaveURL(/\/dashboard/)
  await page.context().storageState({ path: AUTH_FILES.admin })

  // Sesión del administrador de plataforma (GOD)
  const godContext = await browser.newContext({ baseURL: test.info().project.use.baseURL })
  const godPage = await godContext.newPage()
  await godPage.goto("/login")
  await godPage.waitForLoadState("networkidle")
  await godPage.locator("#email").fill(process.env.E2E_GOD_EMAIL ?? "god@hermes.com")
  await godPage.locator("#password").fill(process.env.E2E_GOD_PASSWORD ?? "god123")
  await godPage.getByRole("button", { name: "Iniciar sesión" }).click()
  await expect(godPage).not.toHaveURL(/\/login/)
  await godContext.storageState({ path: AUTH_FILES.god })
  await godContext.close()

  const api = page.request
  await cleanDemoData()

  // Partir sin caja abierta
  const active = await api.get("/api/cash-sessions/active")
  const session = active.ok() ? await active.json().catch(() => null) : null
  if (session?.id) {
    const closed = await api.put(`/api/cash-sessions/${session.id}/close`, {
      data: { closingBalance: Number(session.openingBalance ?? 0) },
    })
    expect(closed.ok()).toBeTruthy()
  }

  // Un producto que se vende por peso
  const found = await (await api.get(`/api/products?search=${encodeURIComponent(WEIGHT_PRODUCT)}`)).json()
  if (!found.products?.some((p: { name: string }) => p.name === WEIGHT_PRODUCT)) {
    const cats = await (await api.get("/api/categories")).json()
    const categoryId = (Array.isArray(cats) ? cats : cats.categories)[0].id
    const created = await api.post("/api/products", {
      data: {
        name: WEIGHT_PRODUCT, purchasePrice: 18000, profitMargin: 0.3, stock: 20000, minStock: 2000,
        categoryId, sellByWeight: true, weightUnit: "kg",
      },
    })
    expect(created.ok(), await created.text()).toBeTruthy()
  }

  // Un cliente para la factura
  const customers = await (await api.get(`/api/customers?search=${CUSTOMER.cedula}`)).json()
  const list = Array.isArray(customers) ? customers : customers.customers ?? []
  if (!list.some((c: { cedula?: string }) => c.cedula === CUSTOMER.cedula)) {
    const created = await api.post("/api/customers", {
      data: { name: CUSTOMER.name, cedula: CUSTOMER.cedula, email: "cliente@ejemplo.co", address: "Calle 5 # 6-7", phone: "3000000000" },
    })
    expect(created.ok(), await created.text()).toBeTruthy()
  }
})
