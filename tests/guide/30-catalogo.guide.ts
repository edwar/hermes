import { expect, test } from "@playwright/test"
import { recordGuide } from "./lib/recorder"
import { adminApi, removeProductsNamed, SUPPLIER, video } from "./lib/fixtures"

test.describe.configure({ mode: "serial" })

const link = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name, exact: true })

test("30 inventario", async ({ browser }) => {
  const PRODUCT = "Gaseosa Cola 1.5L"
  await removeProductsNamed(PRODUCT)
  await recordGuide(browser, video("inventario"), async (g) => {
    const { page } = g
    const search = page.getByPlaceholder(/Buscar por nombre/)
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(link(page, "Inventario"))
      await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 })
    })
    await g.step(async () => {
      await g.type(search, "Leche")
      await expect(page.getByRole("cell", { name: /Leche Entera/ })).toBeVisible()
    })
    await g.step(async () => {
      await search.fill("")
      await g.click(page.getByRole("combobox").first())
      await g.click(page.getByRole("option", { name: "Lácteos" }))
      await g.click(page.getByRole("button", { name: "Stock bajo" }))
    })
    await g.step(async () => {
      // Se restablecen los filtros antes de abrir el formulario
      await page.getByRole("button", { name: "Stock bajo" }).click()
      await page.getByRole("combobox").first().click()
      await page.getByRole("option", { name: "Todas las categorías" }).click()
      await g.click(page.getByRole("button", { name: "Agregar Producto" }))
    })
    const dialog = page.getByRole("dialog", { name: "Agregar Producto" })
    await g.step(async () => {
      await g.type(dialog.locator("#name"), PRODUCT)
      await g.type(dialog.locator("#purchasePrice"), "3000")
      await g.type(dialog.locator("#profitMargin"), "30")
      await g.type(dialog.locator("#stock"), "24")
    })
    await g.step(async () => {
      await g.click(dialog.locator("#category"))
      await g.click(page.getByRole("option", { name: "Bebidas" }))
      await g.click(dialog.getByRole("button", { name: "Guardar", exact: true }))
      await expect(dialog).toBeHidden()
      await g.type(search, "Gaseosa")
      await expect(page.getByRole("row", { name: new RegExp(PRODUCT) })).toBeVisible()
      await g.point(page.getByRole("row", { name: new RegExp(PRODUCT) }))
    })
    await g.step(async () => {
      await g.click(page.getByRole("row", { name: new RegExp(PRODUCT) }).getByRole("button", { name: "Eliminar" }))
      const confirm = page.getByRole("dialog", { name: "Confirmar eliminación" })
      await expect(confirm).toBeVisible()
      await g.pause(1200)
      await g.click(confirm.getByRole("button", { name: "Eliminar" }))
      await expect(page.getByRole("row", { name: new RegExp(PRODUCT) })).toBeHidden()
    })
  })
})

test("31 movimientos-de-stock", async ({ browser }) => {
  await recordGuide(browser, video("movimientos-de-stock"), async (g) => {
    const { page } = g
    await page.goto("/inventory")
    await expect(page.getByRole("tab", { name: "Movimientos" })).toBeVisible()
    await g.step(async () => g.click(page.getByRole("tab", { name: "Movimientos" })))
    await g.step(async () => {
      await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 })
      await g.point(page.locator("tbody tr").first())
    })
    await g.step(async () => g.click(page.getByRole("button", { name: "Registrar Movimiento" })))
    const dialog = page.getByRole("dialog", { name: "Registrar Movimiento" })
    await g.step(async () => {
      await g.click(dialog.locator("#product"))
      await g.click(page.getByRole("option", { name: /Agua Cristal/ }))
      await g.click(dialog.locator("#type"))
      await g.click(page.getByRole("option", { name: "Entrada" }))
      await g.type(dialog.locator("#quantity"), "20")
    })
    await g.step(async () => {
      await g.type(dialog.locator("#reason"), "Reposición del proveedor")
      await g.click(dialog.getByRole("button", { name: /Guardar|Registrar/ }).last())
      await expect(dialog).toBeHidden({ timeout: 20_000 })
    })
  })
})

test("32 categorias", async ({ browser }) => {
  await recordGuide(browser, video("categorias"), async (g) => {
    const { page } = g
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(link(page, "Categorías"))
      await expect(page.getByRole("button", { name: "Nueva Categoría" })).toBeVisible()
    })
    await g.step(async () => g.point(page.getByRole("columnheader", { name: "Productos" })))
    await g.step(async () => g.click(page.getByRole("button", { name: "Nueva Categoría" })))
    const dialog = page.getByRole("dialog", { name: "Nueva Categoría" })
    await g.step(async () => {
      await g.type(dialog.getByPlaceholder("Ej: Bebidas"), "Panadería")
      await g.type(dialog.getByPlaceholder("Descripción opcional"), "Pan, tortas y repostería")
    })
    await g.step(async () => {
      await g.click(dialog.getByRole("button", { name: "Guardar" }))
      await expect(dialog).toBeHidden()
      await g.point(page.getByRole("cell", { name: "Panadería", exact: true }))
    })
  })
})

test("33 clientes", async ({ browser }) => {
  const cedula = `52${Math.floor(1_000_000 + Math.random() * 8_999_999)}`
  await recordGuide(browser, video("clientes"), async (g) => {
    const { page } = g
    const search = page.getByPlaceholder(/Buscar por nombre, email/)
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(link(page, "Clientes"))
      await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 })
    })
    await g.step(async () => {
      await g.type(search, "Cliente")
      await g.pause(600)
      await search.fill("")
    })
    await g.step(async () => g.click(page.getByRole("button", { name: "Nuevo Cliente" })))
    const dialog = page.getByRole("dialog", { name: "Nuevo Cliente" })
    await g.step(async () => {
      await g.type(dialog.locator("#name"), "María Gómez")
      await g.type(dialog.locator("#cedula"), cedula)
      await g.type(dialog.locator("#email"), "maria.gomez@ejemplo.co")
    })
    await g.step(async () => {
      await g.click(dialog.getByRole("button", { name: "Guardar", exact: true }))
      await expect(dialog).toBeHidden({ timeout: 20_000 })
      await g.type(search, "María")
      await g.point(page.getByRole("cell", { name: /María Gómez/ }))
    })
    await g.step(async () => {
      await g.point(page.getByRole("button", { name: "Editar" }).first())
      await g.point(page.getByRole("button", { name: "Eliminar" }).first())
    })
  })
})

test("34 proveedores", async ({ browser }) => {
  await recordGuide(browser, video("proveedores"), async (g) => {
    const { page } = g
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(link(page, "Proveedores"))
      await expect(page.getByRole("button", { name: "Nuevo Proveedor" })).toBeVisible()
    })
    await g.step(async () => g.click(page.getByRole("button", { name: "Nuevo Proveedor" })))
    const dialog = page.getByRole("dialog", { name: "Agregar Proveedor" })
    await g.step(async () => {
      await g.type(dialog.locator("#name"), SUPPLIER.name)
      await g.type(dialog.locator("#email"), SUPPLIER.email)
      await g.type(dialog.locator("#phone"), SUPPLIER.phone)
      await g.type(dialog.locator("#address"), SUPPLIER.address)
    })
    await g.step(async () => {
      await g.click(dialog.getByRole("button", { name: "Guardar", exact: true }))
      await expect(dialog).toBeHidden({ timeout: 20_000 })
      await expect(page.getByText(SUPPLIER.name).first()).toBeVisible()
      await g.point(page.getByText(SUPPLIER.name).first())
    })
    await g.step(async () => g.type(page.getByPlaceholder(/Buscar por nombre, email/), "Esquina"))
  })
})

test("35 compras", async ({ browser }) => {
  // El proveedor ya existe si se grabó el video anterior; si no, se crea sin grabar.
  const api = await adminApi()
  const found = await (await api.get(`/api/suppliers?search=${encodeURIComponent("Esquina")}`)).json()
  const list = Array.isArray(found) ? found : (found.suppliers ?? [])
  if (!list.some((s: { name: string }) => s.name === SUPPLIER.name)) {
    expect((await api.post("/api/suppliers", { data: SUPPLIER })).ok()).toBeTruthy()
  }
  await api.dispose()

  await recordGuide(browser, video("compras"), async (g) => {
    const { page } = g
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(link(page, "Compras"))
      await expect(page.getByRole("button", { name: "Nuevo Pedido" })).toBeVisible()
    })
    await g.step(async () => g.click(page.getByRole("button", { name: "Nuevo Pedido" })))
    const dialog = page.getByRole("dialog", { name: "Nuevo Pedido a Proveedor" })
    await g.step(async () => {
      await g.click(dialog.getByRole("combobox").first())
      await g.click(page.getByRole("option", { name: SUPPLIER.name }))
    })
    await g.step(async () => {
      await g.click(dialog.getByRole("combobox").nth(1))
      await g.click(page.getByRole("option", { name: /Papas Fritas/ }))
      await g.type(dialog.getByPlaceholder("Cant"), "40")
      await g.type(dialog.getByPlaceholder("P. Compra"), "2500")
      await g.click(dialog.locator("button").filter({ has: page.locator("svg.lucide-plus") }).first())
    })
    await g.step(async () => {
      await g.point(dialog.getByText("Total del pedido"))
      await g.click(dialog.getByRole("button", { name: "Crear Pedido" }))
      await expect(dialog).toBeHidden({ timeout: 20_000 })
    })
    const receive = page.getByRole("dialog", { name: "Recibir Pedido" })
    await g.step(async () => {
      await g.click(page.getByRole("button", { name: "Recibir pedido" }).first())
      await expect(receive).toBeVisible()
      await g.type(receive.locator("input[type=number]").first(), "40")
    })
    await g.step(async () => {
      await g.click(receive.getByRole("button", { name: "Confirmar Recepción" }))
      await expect(receive).toBeHidden({ timeout: 20_000 })
    })
  })
})
