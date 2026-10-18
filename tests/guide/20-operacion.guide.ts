import { expect, test } from "@playwright/test"
import { recordGuide } from "./lib/recorder"
import { video } from "./lib/fixtures"

test.describe.configure({ mode: "serial" })

test("20 dashboard", async ({ browser }) => {
  await recordGuide(browser, video("dashboard"), async (g) => {
    const { page } = g
    const nav = page.getByRole("navigation", { name: "Secciones" })
    await page.goto("/inventory")
    await g.step(async () => {
      await g.click(nav.getByRole("link", { name: "Dashboard", exact: true }))
      await expect(page.getByText("Ventas hoy", { exact: true })).toBeVisible()
    })
    await g.step(async () => g.point(page.getByText("Ventas hoy", { exact: true })))
    await g.step(async () => g.point(page.getByText("Stock bajo", { exact: true })))
    await g.step(async () => g.point(page.getByText("Ventas (30 días)")))
    await g.step(async () => {
      await page.getByText("Productos más vendidos").scrollIntoViewIfNeeded()
      await g.point(page.getByText(/Método de pago/i).first())
      await g.point(page.getByText("Productos más vendidos"))
    })
  })
})

test("21 historial-de-ventas", async ({ browser }) => {
  await recordGuide(browser, video("historial-de-ventas"), async (g) => {
    const { page } = g
    const nav = page.getByRole("navigation", { name: "Secciones" })
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(nav.getByRole("link", { name: "Ventas", exact: true }))
      await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 })
    })
    await g.step(async () => {
      await g.click(page.getByRole("button", { name: /de octubre|de septiembre|de noviembre/ }).first())
      await g.pause(900)
      await page.keyboard.press("Escape")
    })
    await g.step(async () => {
      await g.click(page.getByRole("combobox").first())
      await g.click(page.getByRole("option", { name: "Efectivo" }))
    })
    await g.step(async () => g.click(page.getByRole("button", { name: "Buscar" })))
    await g.step(async () => {
      await g.click(page.locator("tbody tr").first().getByRole("button").last())
      await expect(page.getByRole("dialog")).toBeVisible()
      await g.pause(1500)
      await page.keyboard.press("Escape")
    })
    await g.step(async () => g.point(page.getByRole("button", { name: "Exportar CSV" })))
  })
})

test("22 revisar-facturas-electronicas", async ({ browser }) => {
  await recordGuide(browser, video("revisar-facturas-electronicas"), async (g) => {
    const { page } = g
    const nav = page.getByRole("navigation", { name: "Secciones" })
    const filter = () => page.getByRole("combobox").first()
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(nav.getByRole("link", { name: "Fact. Electrónicas", exact: true }))
      await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 })
    })
    await g.step(async () => g.point(page.getByRole("cell").getByText("Validada", { exact: true }).first()))
    await g.step(async () => {
      await g.click(filter())
      await g.click(page.getByRole("option", { name: "Rechazada" }))
      await expect(page.getByRole("cell").getByText("Rechazada", { exact: true }).first()).toBeVisible()
    })
    await g.step(async () => {
      await g.click(filter())
      await g.click(page.getByRole("option", { name: "Validada" }))
      await expect(page.getByRole("button", { name: "Descargar PDF" }).first()).toBeVisible()
      await g.point(page.getByRole("button", { name: "Descargar PDF" }).first())
      await g.point(page.getByRole("button", { name: "Descargar XML" }).first())
    })
    await g.step(async () => {
      await g.click(filter())
      await g.click(page.getByRole("option", { name: "Rechazada" }))
      const retry = page.getByRole("button", { name: "Reintentar emisión" }).first()
      await expect(retry).toBeVisible()
      await g.point(retry)
    })
  })
})
