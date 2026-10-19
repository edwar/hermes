import { test, expect } from "@playwright/test"
import { removePurchaseData } from "../purchase-fixture"

// Regresión: al pulsar "Recibir pedido" se abrían dos diálogos a la vez (el de recepción y el de detalle),
// porque la recepción guardaba el pedido en el mismo estado que el detalle.

const RUN = Date.now()
const SUPPLIER = `Proveedor E2E ${RUN}`
const PRODUCT = `Producto E2E ${RUN}`
const STOCK_INICIAL = 10

test.describe("Compras: recibir un pedido", () => {
  test.afterAll(async () => {
    await removePurchaseData(SUPPLIER, PRODUCT)
  })

  test("recibir abre solo el diálogo de recepción, y al confirmar sube el stock", async ({ page, request }) => {
    test.setTimeout(90_000)

    // Datos propios de la prueba: un proveedor, un producto con stock conocido y un pedido pendiente
    const categories = (await (await request.get("/api/categories")).json()) as { id: string }[]
    const supplier = await request.post("/api/suppliers", { data: { name: SUPPLIER, email: "e2e@proveedor.test", phone: "3000000000", address: "Calle 1" } })
    expect(supplier.ok(), await supplier.text()).toBeTruthy()
    const product = await request.post("/api/products", {
      data: { name: PRODUCT, purchasePrice: 1000, profitMargin: 0.3, stock: STOCK_INICIAL, minStock: 1, categoryId: categories[0].id },
    })
    expect(product.ok(), await product.text()).toBeTruthy()
    const order = await request.post("/api/purchase-orders", {
      data: { supplierId: (await supplier.json()).id, items: [{ productId: (await product.json()).id, quantity: 8, purchasePrice: 1000 }] },
    })
    expect(order.ok(), await order.text()).toBeTruthy()

    await page.goto("/purchase-orders")
    const row = page.getByRole("row").filter({ hasText: SUPPLIER })
    await expect(row).toBeVisible()
    await expect(row.getByText("Pendiente")).toBeVisible()

    // Recibir: solo el diálogo de recepción
    await row.getByRole("button", { name: "Recibir pedido" }).click()
    const receive = page.getByRole("dialog", { name: "Recibir Pedido" })
    await expect(receive).toBeVisible()
    await expect(page.getByRole("dialog", { name: "Detalle del Pedido" })).toHaveCount(0)
    await expect(page.getByRole("dialog")).toHaveCount(1)

    // Confirmar con una cantidad menor a la pedida
    await receive.getByRole("spinbutton").fill("5")
    await receive.getByRole("button", { name: "Confirmar Recepción" }).click()
    await expect(receive).toBeHidden()
    await expect(row.getByText("Recibido")).toBeVisible()

    // El stock subió exactamente lo recibido
    const after = (await (await request.get(`/api/products?search=${encodeURIComponent(PRODUCT)}`)).json()) as { products: { name: string; stock: number }[] }
    expect(after.products.find((p) => p.name === PRODUCT)?.stock).toBe(STOCK_INICIAL + 5)

    // Ver el detalle abre solo el detalle
    await row.getByRole("button", { name: "Ver detalle" }).click()
    await expect(page.getByRole("dialog", { name: "Detalle del Pedido" })).toBeVisible()
    await expect(page.getByRole("dialog", { name: "Recibir Pedido" })).toHaveCount(0)
  })
})
