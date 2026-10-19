import { test, expect } from "@playwright/test"
import { closeActiveCashSession } from "../helpers"

test.describe("Reporte de cierre de caja", () => {
  test("no se imprime solo: abre el reporte y se imprime con el botón", async ({ page, request }) => {
    // Una sesión de caja ya cerrada, para ver su reporte desde el historial
    await closeActiveCashSession(request)
    const registers = (await (await request.get("/api/cash-registers")).json()) as { id: string }[]
    const opened = await request.post("/api/cash-sessions", { data: { cashRegisterId: registers[0].id, openingBalance: 1000 } })
    expect(opened.ok(), await opened.text()).toBeTruthy()
    const session = await opened.json()
    expect((await request.put(`/api/cash-sessions/${session.id}/close`, { data: { closingBalance: 1000 } })).ok()).toBeTruthy()

    // Cuenta las veces que se pide imprimir (en un navegador sin cabeza no abriría el diálogo del sistema)
    await page.addInitScript(() => {
      ;(window as unknown as { __prints: number }).__prints = 0
      window.print = () => {
        ;(window as unknown as { __prints: number }).__prints++
      }
    })
    const prints = () => page.evaluate(() => (window as unknown as { __prints: number }).__prints)

    await page.goto("/cajas")
    await page.getByRole("button", { name: "Ver reporte" }).first().click()
    const printButton = page.getByRole("button", { name: "Imprimir recibo" })
    await expect(printButton).toBeVisible()

    // Antes se imprimía a los 500 ms de abrirse; esperamos bastante más que eso
    await page.waitForTimeout(2_000)
    expect(await prints()).toBe(0)

    await printButton.click()
    await expect.poll(prints).toBe(1)
  })
})
