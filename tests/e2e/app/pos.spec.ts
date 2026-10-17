import { test, expect, type Page } from "@playwright/test"
import { closeActiveCashSession, cop, openCashSessionFromPos } from "../helpers"

// Un solo flujo continuo: cierra la caja, la abre y vende. Comparte estado, por eso va en serie.
test.describe.configure({ mode: "serial" })

const tile = (page: Page, name: string | RegExp) => page.getByRole("button", { name }).first()
const total = (page: Page) => page.locator("[aria-live=polite]").first()
const subtotalOf = (page: Page) => page.getByText("Subtotal").locator("xpath=following-sibling::dd[1]")

test.describe("Punto de venta", () => {
  test("sin caja abierta el POS exige abrir una", async ({ page, request }) => {
    await closeActiveCashSession(request)
    await page.goto("/pos")
    await expect(page.getByRole("heading", { name: "Sesión de caja requerida" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Abrir Caja" })).toBeVisible()
  })

  test("el diálogo de apertura valida la caja y la base", async ({ page }) => {
    await page.goto("/pos")
    await page.getByRole("button", { name: "Abrir Caja" }).click()
    const dialog = page.getByRole("dialog", { name: "Abrir Caja" })
    await expect(dialog.getByRole("button", { name: "Abrir Caja" })).toBeDisabled()
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()
  })

  test("abre la caja con una base inicial", async ({ page }) => {
    await openCashSessionFromPos(page, "100000")
    await expect(page.getByText(/Base\s+\$\s*100\.000/)).toBeVisible()
    await expect(page.getByRole("button", { name: "Cerrar caja" })).toBeVisible()
  })

  test("el ticket vacío no permite cobrar ni abre el cobro con Espacio", async ({ page }) => {
    await page.goto("/pos")
    await expect(page.getByText("Ticket vacío")).toBeVisible()
    await expect(page.getByRole("button", { name: /Cobrar/ })).toBeDisabled()
    await page.locator("body").click({ position: { x: 5, y: 5 } })
    await page.keyboard.press("Space")
    await expect(page.getByRole("dialog", { name: /Finalizar venta/ })).toBeHidden()
  })

  test("agregar productos suma al ticket: subtotal, IVA 19% y total", async ({ page }) => {
    await page.goto("/pos")
    await tile(page, /Jugo Hit Tropical/).click()
    await tile(page, /Perro Caliente/).click()
    await expect(page.getByText("2 ítems")).toBeVisible()

    const sub = cop(await subtotalOf(page).textContent())
    const iva = cop(await page.getByText(/IVA \(19%\)/).locator("xpath=following-sibling::dd[1]").textContent())
    const tot = cop(await total(page).textContent())
    expect(sub).toBeGreaterThan(0)
    expect(iva).toBe(Math.round(sub * 0.19))
    expect(tot).toBe(sub + iva)
  })

  test("el catálogo marca los productos que ya están en el ticket", async ({ page }) => {
    await page.goto("/pos")
    await tile(page, /Jugo Hit Tropical/).click()
    await expect(tile(page, /Jugo Hit Tropical/)).toContainText("×1")
    await tile(page, /Jugo Hit Tropical/).click()
    await expect(tile(page, /Jugo Hit Tropical/)).toContainText("×2")
  })

  test("los botones de cantidad actualizan el total y quitar vacía el ticket", async ({ page }) => {
    await page.goto("/pos")
    // El carrito se conserva entre cargas: partimos de uno limpio.
    while (await page.getByRole("button", { name: /^Quitar .* del ticket$/ }).count()) {
      await page.getByRole("button", { name: /^Quitar .* del ticket$/ }).first().click()
    }
    await tile(page, /Agua Cristal/).click()
    const unit = cop(await total(page).textContent())
    await page.getByRole("button", { name: "Aumentar cantidad" }).click()
    await expect.poll(async () => cop(await total(page).textContent())).toBe(unit * 2)
    await page.getByRole("button", { name: "Disminuir cantidad" }).click()
    await expect.poll(async () => cop(await total(page).textContent())).toBe(unit)
    await page.getByRole("button", { name: /^Quitar Agua Cristal.* del ticket$/ }).click()
    await expect(page.getByText("Ticket vacío")).toBeVisible()
    await expect(page.getByRole("button", { name: /Cobrar/ })).toBeDisabled()
  })

  test("la búsqueda filtra el catálogo y avisa cuando no hay resultados", async ({ page }) => {
    await page.goto("/pos")
    const search = page.getByPlaceholder(/Buscar producto/)
    await search.fill("Coca")
    await expect(tile(page, /Coca-Cola/)).toBeVisible()
    await expect(tile(page, /Leche Entera/)).toBeHidden()
    await search.fill("zzz-no-existe")
    await expect(page.getByText("No se encontraron productos")).toBeVisible()
  })

  test("cobra en efectivo con Espacio, descuenta stock y deja la venta registrada", async ({ page, request }) => {
    const stockOf = async () => {
      const res = await request.get("/api/products?search=Coca-Cola&pageSize=5")
      const json = await res.json()
      return json.products.find((p: { name: string }) => p.name.startsWith("Coca-Cola")).stock as number
    }

    await page.goto("/pos")
    while (await page.getByRole("button", { name: /^Quitar .* del ticket$/ }).count()) {
      await page.getByRole("button", { name: /^Quitar .* del ticket$/ }).first().click()
    }

    const stockBefore = await stockOf()
    await tile(page, /Coca-Cola/).click()
    const totalToPay = cop(await total(page).textContent())

    await page.locator("body").click({ position: { x: 5, y: 5 } })
    await page.keyboard.press("Space")
    const dialog = page.getByRole("dialog", { name: /Finalizar venta/ })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("Efectivo")).toBeVisible()

    // Pago exacto
    await dialog.getByPlaceholder(/Mínimo/).fill(String(totalToPay))
    await dialog.getByRole("button", { name: /^Confirmar/ }).click()
    await expect(page.getByText(/se ha registrado exitosamente/i)).toBeVisible()

    // El servidor descontó el stock
    expect(await stockOf()).toBe(stockBefore - 1)

    // Y el catálogo del POS lo refleja sin recargar (regresión: antes se quedaba con el stock viejo)
    await page.keyboard.press("Escape")
    await expect
      .poll(async () => cop(await tile(page, /Coca-Cola/).getByText(/\d+ u|\d+ BAJO/).textContent()), { timeout: 15_000 })
      .toBe(stockBefore - 1)

    // La venta aparece en el historial con su total
    await page.goto("/sales")
    await expect(page.getByRole("cell", { name: new RegExp(`\\$\\s*${totalToPay.toLocaleString("es-CO")}`) }).first()).toBeVisible()
  })
})
