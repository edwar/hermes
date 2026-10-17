import { test, expect } from "@playwright/test"

test.describe.configure({ mode: "serial" })

const NAME = `E2E Producto ${Date.now()}`
const RENAMED = `${NAME} editado`

test.describe("Inventario", () => {
  test("lista productos y permite buscarlos", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.getByRole("main").getByRole("heading", { name: "Inventario" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Producto" })).toBeVisible()
    await page.getByPlaceholder(/Buscar por nombre/).fill("Leche")
    await expect(page.getByRole("cell", { name: /Leche Entera/ })).toBeVisible()
    await expect(page.getByRole("cell", { name: /Cloro/ })).toBeHidden()
  })

  test("crea un producto desde el modal y calcula el precio de venta", async ({ page }) => {
    await page.goto("/inventory")
    await page.getByRole("button", { name: "Agregar Producto" }).click()
    const dialog = page.getByRole("dialog", { name: "Agregar Producto" })
    await dialog.locator("#name").fill(NAME)
    await dialog.locator("#purchasePrice").fill("1000")
    await dialog.locator("#profitMargin").fill("30")
    await dialog.locator("#stock").fill("10")
    await dialog.locator("#minStock").fill("2")
    await dialog.locator("#category").click()
    await page.getByRole("option").first().click()
    await dialog.getByRole("button", { name: "Guardar" }).click()
    await expect(dialog).toBeHidden()

    await page.getByPlaceholder(/Buscar por nombre/).fill(NAME)
    const row = page.getByRole("row", { name: new RegExp(NAME) })
    await expect(row).toBeVisible()
    await expect(row).toContainText("$ 1.300") // 1.000 + 30 %
  })

  test("exige el nombre y una categoría", async ({ page }) => {
    await page.goto("/inventory")
    await page.getByRole("button", { name: "Agregar Producto" }).click()
    const dialog = page.getByRole("dialog", { name: "Agregar Producto" })
    await dialog.getByRole("button", { name: "Guardar" }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()
  })

  test("edita el producto", async ({ page }) => {
    await page.goto("/inventory")
    await page.getByPlaceholder(/Buscar por nombre/).fill(NAME)
    await page.getByRole("row", { name: new RegExp(NAME) }).getByRole("button", { name: "Editar" }).click()
    const dialog = page.getByRole("dialog", { name: "Editar Producto" })
    // Regresión: la categoría debe mostrar su nombre, no su identificador interno
    await expect(dialog.locator("#category")).not.toHaveText(/^c[a-z0-9]{20,}$/)
    await expect(dialog.locator("#category")).toHaveText(/\S/)
    await dialog.locator("#name").fill(RENAMED)
    await dialog.getByRole("button", { name: "Guardar cambios" }).click()
    await expect(dialog).toBeHidden()
    await page.getByPlaceholder(/Buscar por nombre/).fill(RENAMED)
    await expect(page.getByRole("row", { name: new RegExp(RENAMED) })).toBeVisible()
  })

  test("eliminar pide confirmación y se puede cancelar", async ({ page }) => {
    await page.goto("/inventory")
    await page.getByPlaceholder(/Buscar por nombre/).fill(RENAMED)
    await page.getByRole("row", { name: new RegExp(RENAMED) }).getByRole("button", { name: "Eliminar" }).click()
    const confirm = page.getByRole("dialog", { name: "Confirmar eliminación" })
    await expect(confirm).toBeVisible()
    await confirm.getByRole("button", { name: "Cancelar" }).click()
    await expect(page.getByRole("row", { name: new RegExp(RENAMED) })).toBeVisible()
  })

  test("confirmar la eliminación retira el producto de la lista", async ({ page }) => {
    await page.goto("/inventory")
    await page.getByPlaceholder(/Buscar por nombre/).fill(RENAMED)
    await page.getByRole("row", { name: new RegExp(RENAMED) }).getByRole("button", { name: "Eliminar" }).click()
    await page.getByRole("dialog", { name: "Confirmar eliminación" }).getByRole("button", { name: "Eliminar" }).click()
    await expect(page.getByRole("row", { name: new RegExp(RENAMED) })).toBeHidden()
  })
})
