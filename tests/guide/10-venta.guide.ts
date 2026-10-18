import { test, expect, type Page } from "@playwright/test"
import { recordGuide } from "./lib/recorder"
import { CUSTOMER, video, WEIGHT_PRODUCT } from "./lib/fixtures"

/**
 * Graba la guía de uso, un video por flujo. Los videos comparten estado (la caja que abre el primero
 * la usan los siguientes), por eso van en serie y en este orden.
 *
 *   E2E_DATABASE_URL=<base de pruebas> pnpm guide:record
 *   pnpm guide:record --grep "00|vender-y-cobrar"      # un solo video (con su preparación)
 */
test.describe.configure({ mode: "serial" })

const tile = (page: Page, name: string | RegExp) => page.getByRole("button", { name }).first()
const ticketTotal = (page: Page) => page.locator("[aria-live=polite]").first()

test("01 abrir-caja", async ({ browser }) => {
  await recordGuide(browser, video("abrir-caja"), async (g) => {
    const { page } = g
    await page.goto("/dashboard")
    await g.step(async () => g.click(page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: "POS", exact: true })))
    await g.step(async () => g.click(page.getByRole("button", { name: "Abrir Caja" })))
    const dialog = page.getByRole("dialog", { name: "Abrir Caja" })
    await g.step(async () => {
      await g.click(dialog.getByRole("combobox"))
      await g.click(page.getByRole("option").first())
    })
    await g.step(async () => g.type(dialog.locator("#base"), "100000"))
    await g.step(async () => g.click(dialog.getByRole("button", { name: "Abrir Caja" })))
    await g.step(async () => {
      await expect(page.getByText("Caja abierta", { exact: true })).toBeVisible()
      await g.point(page.getByText("Caja abierta", { exact: true }))
    })
  })
})

test("02 pantalla-de-venta", async ({ browser }) => {
  await recordGuide(browser, video("pantalla-de-venta"), async (g) => {
    const { page } = g
    await page.goto("/pos")
    const search = page.getByPlaceholder(/Buscar producto/)
    await expect(tile(page, /Detergente Fab/)).toBeVisible()
    await g.step(async () => g.point(tile(page, /Detergente Fab/)))
    await g.step(async () => {
      await g.type(search, "Leche")
      await expect(tile(page, /Leche Entera/)).toBeVisible()
    })
    await g.step(async () => {
      await search.fill("")
      await expect(tile(page, /Jabón Rey/)).toBeVisible()
      await g.point(tile(page, /Jabón Rey/))
    })
    await g.step(async () => g.click(tile(page, /Perro Caliente/)))
    await g.step(async () => g.point(ticketTotal(page)))
    await g.step(async () => g.point(page.getByRole("button", { name: /Cobrar/ })))
  })
})

test("03 vender-y-cobrar", async ({ browser }) => {
  await recordGuide(browser, video("vender-y-cobrar"), async (g) => {
    const { page } = g
    await page.goto("/pos")
    await expect(tile(page, /Jugo Hit/)).toBeVisible()
    await g.step(async () => {
      await g.click(tile(page, /Jugo Hit/))
      await g.click(tile(page, /Perro Caliente/))
      await g.click(tile(page, /Agua Cristal/))
    })
    await g.step(async () => g.click(page.getByRole("button", { name: "Aumentar cantidad" }).first()))
    await g.step(async () => g.click(page.getByRole("button", { name: /^Quitar Agua Cristal.* del ticket$/ })))
    await g.step(async () => g.press("Space", "ESPACIO"))
    const dialog = page.getByRole("dialog", { name: /Finalizar venta/ })
    await expect(dialog).toBeVisible()
    await g.step(async () => g.click(dialog.getByRole("button", { name: "$20.000", exact: true })))
    await g.step(async () => g.point(dialog.getByText("Cambio").first()))
    await g.step(async () => {
      await g.click(dialog.getByRole("button", { name: /^Confirmar/ }))
      await expect(page.getByRole("dialog", { name: "Venta completada" })).toBeVisible()
    })
    await g.step(async () => g.click(page.getByRole("button", { name: "Nueva venta" })))
  })
})

test("04 productos-por-peso", async ({ browser }) => {
  await recordGuide(browser, video("productos-por-peso"), async (g) => {
    const { page } = g
    await page.goto("/pos")
    const weight = page.locator("input[type=number]").first()
    await expect(tile(page, new RegExp(WEIGHT_PRODUCT))).toBeVisible()
    await g.step(async () => g.click(tile(page, new RegExp(WEIGHT_PRODUCT))))
    await g.step(async () => g.type(weight, "1"))
    await g.step(async () => g.point(ticketTotal(page)))
    await g.step(async () => {
      await g.click(weight)
      await weight.press("ControlOrMeta+A")
      await weight.pressSequentially("1.5", { delay: 120 })
      await page.waitForTimeout(500)
    })
    await g.step(async () => {
      await page.locator("body").click({ position: { x: 5, y: 5 } })
      await g.press("Space", "ESPACIO")
      const dialog = page.getByRole("dialog", { name: /Finalizar venta/ })
      await dialog.getByPlaceholder(/Mínimo/).fill(String(Math.ceil((await ticketTotalNumber(page)) / 1000) * 1000))
      await g.click(dialog.getByRole("button", { name: /^Confirmar/ }))
      await expect(page.getByRole("dialog", { name: "Venta completada" })).toBeVisible()
      await g.click(page.getByRole("button", { name: "Nueva venta" }))
    })
  })
})

async function ticketTotalNumber(page: Page) {
  return Number(((await ticketTotal(page).textContent()) ?? "").replace(/[^\d]/g, ""))
}

test("05 factura-electronica", async ({ browser }) => {
  await recordGuide(browser, video("factura-electronica"), async (g) => {
    const { page } = g
    await page.goto("/pos")
    await expect(tile(page, /Perro Caliente/)).toBeVisible()
    await g.step(async () => g.click(tile(page, /Perro Caliente/)))
    await g.step(async () => g.press("Space", "ESPACIO"))
    const dialog = page.getByRole("dialog", { name: /Finalizar venta/ })
    await expect(dialog).toBeVisible()
    await g.step(async () => {
      await g.type(dialog.getByPlaceholder("Cédula / NIT del cliente"), CUSTOMER.cedula)
      await g.click(dialog.getByRole("button", { name: "Buscar" }))
      await expect(dialog.getByText(CUSTOMER.name)).toBeVisible()
    })
    await g.step(async () => g.click(dialog.getByText("Factura electrónica DIAN", { exact: true })))
    await g.step(async () => {
      await g.click(dialog.getByRole("button", { name: "Tarjeta" }))
      await g.click(dialog.getByRole("button", { name: /^Confirmar/ }))
    })
    await g.step(async () => {
      await expect(page.getByRole("dialog", { name: "Venta completada" })).toBeVisible({ timeout: 50_000 })
      // La venta debe haberse procesado en línea; si quedó en cola local, el video sería engañoso.
      await expect(page.getByText(/guardada localmente|encolada/i)).toHaveCount(0)
      await g.pause(1800)
      await g.click(page.getByRole("button", { name: "Nueva venta" }))
    })
    await g.step(async () => {
      await g.click(page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: "Fact. Electrónicas" }))
      // La fila más reciente debe ser esta venta, ya validada por la DIAN.
      const latest = page.getByRole("row").nth(1)
      await expect(latest).toContainText("Factura")
      await expect(latest.getByText("Validada", { exact: true })).toBeVisible({ timeout: 20_000 })
      await g.point(latest.getByText("Validada", { exact: true }))
    })
  })
})

test("06 devolucion", async ({ browser }) => {
  await recordGuide(browser, video("devolucion"), async (g) => {
    const { page } = g
    const nav = page.getByRole("navigation", { name: "Secciones" })
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(nav.getByRole("link", { name: "Ventas", exact: true }))
      await g.click(page.locator("span[title='Copiar ID']").first())
    })
    await g.step(async () => {
      await g.click(nav.getByRole("link", { name: "POS", exact: true }))
      await g.click(page.getByRole("button", { name: "Devolución" }))
    })
    const dialog = page.getByRole("dialog", { name: "Devolución" })
    await g.step(async () => {
      await g.click(dialog.locator("#sale-search"))
      await page.keyboard.press("ControlOrMeta+V")
      await page.waitForTimeout(500)
      await g.click(dialog.getByRole("button", { name: "Buscar" }))
      await expect(dialog.getByRole("button", { name: "Procesar devolución" })).toBeVisible()
    })
    await g.step(async () => g.click(dialog.locator("button").filter({ has: page.locator("svg.lucide-plus") }).first()))
    await g.step(async () => {
      const label = dialog.getByText("Nota crédito DIAN", { exact: true })
      await g.point(label)
      const box = dialog.getByRole("checkbox", { name: /Nota crédito DIAN/ })
      if ((await box.getAttribute("aria-checked")) !== "true") await g.click(label)
    })
    await g.step(async () => {
      await g.type(dialog.locator("#return-reason"), "Producto en mal estado")
      await g.click(dialog.getByRole("button", { name: "Procesar devolución" }))
      await expect(dialog).toBeHidden({ timeout: 50_000 })
      await expect(page.getByText(/guardada localmente|encolada/i)).toHaveCount(0)
    })
    await g.step(async () => {
      await g.click(nav.getByRole("link", { name: "Fact. Electrónicas" }))
      const latest = page.getByRole("row").nth(1)
      await expect(latest).toContainText("Nota Crédito")
      await expect(latest.getByText("Validada", { exact: true })).toBeVisible({ timeout: 20_000 })
      await g.point(latest)
    })
  })
})

test("07 cerrar-caja", async ({ browser }) => {
  await recordGuide(browser, video("cerrar-caja"), async (g) => {
    const { page } = g
    await page.goto("/pos")
    const dialog = page.getByRole("dialog")
    await expect(page.getByRole("button", { name: "Cerrar caja" })).toBeVisible()
    await g.step(async () => {
      await g.click(page.getByRole("button", { name: "Cerrar caja" }))
      await expect(dialog.getByText("Resumen de sesión")).toBeVisible()
    })
    await g.step(async () => g.point(dialog.getByText("Ventas por método")))
    await g.step(async () => {
      await g.point(dialog.getByText("Efectivo en caja", { exact: true }))
      await g.click(dialog.getByRole("button", { name: /Continuar/ }))
      await expect(dialog.getByText("Monto que deberías tener")).toBeVisible()
    })
    const expectedText = await dialog.getByText("Monto que deberías tener").locator("xpath=following-sibling::span").textContent()
    const expected = String(Number((expectedText ?? "").replace(/[^\d]/g, "")))
    await g.step(async () => g.type(dialog.locator("#closing"), expected))
    await g.step(async () => g.point(dialog.getByText("Diferencia", { exact: true })))
    await g.step(async () => {
      await g.click(dialog.getByRole("button", { name: "Confirmar cierre" }))
      await g.pause(2500)
    })
  })
})
