import { test, expect } from "@playwright/test"
import { login } from "../helpers"

test.describe("Permisos por rol", () => {
  test("el cajero solo ve lo que necesita para vender", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "cajero@hermes.com", "cajero123")
    await expect(page).toHaveURL(/\/dashboard/)

    const nav = page.getByRole("navigation", { name: "Secciones" })
    for (const visible of ["Dashboard", "POS", "Ventas", "Clientes"]) {
      await expect(nav.getByRole("link", { name: visible, exact: true })).toBeVisible()
    }
    for (const hidden of ["Usuarios", "Configuración", "Inventario", "Proveedores", "Cajas"]) {
      await expect(nav.getByRole("link", { name: hidden, exact: true }), `${hidden} no debe verse`).toHaveCount(0)
    }
    await context.close()
  })

  test("el cajero no puede cambiar credenciales de Factus ni reintentar facturas de la empresa", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "cajero@hermes.com", "cajero123")
    await expect(page).toHaveURL(/\/dashboard/)

    const put = await context.request.put("/api/factus/settings", {
      data: { credentials: { clientId: "a", clientSecret: "b", username: "c", password: "d" } },
    })
    expect(put.status()).toBe(403)
    const retry = await context.request.post("/api/invoicing/retry")
    expect(retry.status()).toBe(403)
    await context.close()
  })

  test("el cajero no puede llamar a rutas de módulos que el menú le oculta", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "cajero@hermes.com", "cajero123")
    await expect(page).toHaveURL(/\/dashboard/)

    const api = context.request
    expect((await api.get("/api/stock-movements")).status()).toBe(403)
    expect((await api.post("/api/stock-movements", { data: { type: "IN", quantity: 1, reason: "x", productId: "x" } })).status()).toBe(403)
    expect((await api.get("/api/categories")).status()).toBe(403)
    expect((await api.post("/api/categories", { data: { name: "Hackeada" } })).status()).toBe(403)
    expect((await api.get("/api/cash-sessions")).status()).toBe(403)
    expect((await api.get("/api/cash-sessions/no-existe/report")).status()).toBe(403)

    // Lo que sí necesita para vender sigue funcionando.
    expect((await api.get("/api/customers")).status()).toBe(200)
    expect((await api.get("/api/cash-sessions/active")).status()).toBe(200)
    expect((await api.get("/api/dashboard")).status()).toBe(200)
    await context.close()
  })

  test("el administrador sigue usando esas mismas rutas", async ({ request }) => {
    for (const url of ["/api/stock-movements", "/api/categories", "/api/cash-sessions", "/api/customers"]) {
      expect((await request.get(url)).status(), url).toBe(200)
    }
  })

  test("el cajero no puede cambiar la configuración de la tienda ni exportar lo que no ve", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "cajero@hermes.com", "cajero123")
    await expect(page).toHaveURL(/\/dashboard/)
    const api = context.request

    // Antes cualquier rol podía cambiar el IVA o el nombre de la tienda
    expect((await api.put("/api/settings", { data: { taxRate: 0, storeName: "Hackeada" } })).status()).toBe(403)
    // ...y los datos de la tienda siguen siendo legibles para imprimir tickets
    expect((await api.get("/api/settings")).status()).toBe(200)

    // Exportar: solo los reportes del módulo que ve (Ventas y Facturas electrónicas sí; inventario y cajas no)
    expect((await api.get("/api/exports/sales")).status()).toBe(200)
    expect((await api.get("/api/exports/inventory")).status()).toBe(403)
    expect((await api.get("/api/exports/cash-movements")).status()).toBe(403)
    expect((await api.get("/api/exports/stock-movements")).status()).toBe(403)
    expect((await api.get("/api/exports/credit-transactions")).status()).toBe(403)

    // Configuración de caja: puede leer lo que el POS necesita, pero no cambiarlo
    expect((await api.get("/api/cash-registers")).status()).toBe(200)
    expect((await api.get("/api/cash-denominations")).status()).toBe(200)
    expect((await api.post("/api/cash-registers", { data: { name: "Caja falsa" } })).status()).toBe(403)
    expect((await api.post("/api/cash-denominations", { data: { value: 1, label: "$1" } })).status()).toBe(403)

    // Medios de pago y ajustes del sistema: no los puede cambiar, y no ve los ajustes globales
    expect((await api.put("/api/settings/configs", { data: { type: "paymentMethod", internalCode: "X", name: "X", factusPaymentForm: 1, factusPaymentMethodCode: "10" } })).status()).toBe(403)
    expect((await api.put("/api/settings/configs", { data: { type: "systemConfig", category: "x", key: "x", value: "x", label: "x" } })).status()).toBe(403)
    const configs = await (await api.get("/api/settings/configs")).json()
    expect(configs.systemConfigs).toEqual([])
    await context.close()
  })

  test("el administrador conserva sus permisos y la configuración de Factus no se filtra por la API de ajustes", async ({ request, browser }) => {
    expect((await request.get("/api/exports/inventory")).status()).toBe(200)
    expect((await request.get("/api/cash-registers")).status()).toBe(200)
    const settings = await (await request.get("/api/settings")).json()
    expect((await request.put("/api/settings", { data: { storeName: settings.storeName } })).status()).toBe(200)
    // Un administrador de empresa no puede tocar los ajustes globales
    expect((await request.put("/api/settings/configs", { data: { type: "systemConfig", category: "factus", key: "api_url", value: "https://evil.factus.com.co", label: "x" } })).status()).toBe(403)
    expect((await request.delete("/api/settings/configs?type=systemConfig&id=cualquiera")).status()).toBe(400)

    // El GOD ve los ajustes del sistema pero nunca los de Factus (secretos cifrados incluidos)
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "god@hermes.com", "god123")
    await expect(page).not.toHaveURL(/\/login/)
    const res = await context.request.get("/api/settings/configs")
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).not.toMatch(/client_secret_enc|password_enc|"category":"factus"/)
    expect((await context.request.put("/api/settings/configs", { data: { type: "systemConfig", category: "factus", key: "api_url", value: "https://x.factus.com.co", label: "x" } })).status()).toBe(400)
    await context.close()
  })

  test("el gestor ve el historial para los reportes, pero no vende ni mueve la caja", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await login(page, "gerente@hermes.com", "gerente123")
    await expect(page).not.toHaveURL(/\/login/)
    const api = context.request

    expect((await api.get("/api/sales")).status()).toBe(200) // lo usa la página de Reportes
    expect((await api.post("/api/sales", { data: {} })).status()).toBe(403)
    expect((await api.post("/api/cash-movements", { data: { type: "IN", amount: 1, reason: "x", sessionId: "x" } })).status()).toBe(403)
    expect((await api.get("/api/exports/inventory")).status()).toBe(200)
    expect((await api.get("/api/exports/cash-movements")).status()).toBe(403)
    await context.close()
  })

  test("inventario, compras y proveedores respetan el módulo de cada rol", async ({ browser }) => {
    const as = async (email: string, password: string) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const page = await context.newPage()
      await login(page, email, password)
      await expect(page).not.toHaveURL(/\/login/)
      return context
    }

    // Cajero: lee el catálogo para vender, pero no lo administra ni ve compras ni proveedores
    const cashier = await as("cajero@hermes.com", "cajero123")
    expect((await cashier.request.get("/api/products")).status()).toBe(200)
    expect((await cashier.request.post("/api/products", { data: { name: "Hackeado" } })).status()).toBe(403)
    expect((await cashier.request.put("/api/products", { data: { id: "x" } })).status()).toBe(403)
    expect((await cashier.request.delete("/api/products?id=x")).status()).toBe(403)
    expect((await cashier.request.get("/api/purchase-orders")).status()).toBe(403)
    expect((await cashier.request.post("/api/purchase-orders/receive", { data: {} })).status()).toBe(403)
    expect((await cashier.request.get("/api/suppliers")).status()).toBe(403)
    expect((await cashier.request.post("/api/suppliers", { data: { name: "X" } })).status()).toBe(403)
    await cashier.close()

    // Gestor: administra inventario y compras; ve proveedores para armar pedidos, pero no los edita ni borra productos
    const manager = await as("gerente@hermes.com", "gerente123")
    expect((await manager.request.get("/api/purchase-orders")).status()).toBe(200)
    expect((await manager.request.get("/api/suppliers")).status()).toBe(200)
    expect((await manager.request.post("/api/suppliers", { data: { name: "X" } })).status()).toBe(403)
    expect((await manager.request.delete("/api/products?id=x")).status()).toBe(403)
    expect((await manager.request.delete("/api/products/x")).status()).toBe(403)
    await manager.close()
  })

  test("nadie puede darse el rol GOD ni tocar a quien no debe", async ({ request, browser }) => {
    const users = (await (await request.get("/api/users")).json()) as { id: string; email: string; role: string }[]
    const cashier = users.find((u) => u.email === "cajero@hermes.com")!
    const admin = users.find((u) => u.email === "admin@hermes.com")!
    const put = (data: Record<string, unknown>) => request.put("/api/users", { data })

    // Escalación de privilegios: un administrador de empresa no puede crear ni volverse GOD
    expect((await put({ id: cashier.id, role: "GOD" })).status()).toBe(400)
    expect((await put({ id: admin.id, role: "GOD" })).status()).toBe(400)
    expect((await request.post("/api/users", { data: { name: "X", email: "x@x.co", password: "123456", role: "GOD" } })).status()).toBe(400)
    // ...ni asignar los roles que no le corresponden, ni cambiarse el suyo, ni desactivarse
    expect((await put({ id: cashier.id, role: "OWNER" })).status()).toBe(403)
    expect((await put({ id: cashier.id, role: "ADMIN" })).status()).toBe(403)
    expect((await request.post("/api/users", { data: { name: "X", email: "x@x.co", password: "123456", role: "OWNER" } })).status()).toBe(403)
    expect((await put({ id: admin.id, role: "OWNER" })).status()).toBe(403)
    expect((await put({ id: admin.id, isActive: false })).status()).toBe(403)
    expect((await put({ id: cashier.id, password: "corta" })).status()).toBe(400)
    expect((await put({ id: "no-existe", name: "X" })).status()).toBe(404)

    // Usuarios de otra empresa y el GOD no existen para este administrador
    const god = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await god.newPage()
    await login(page, "god@hermes.com", "god123")
    await expect(page).not.toHaveURL(/\/login/)
    const godId = (await (await god.request.get("/api/profile")).json()).user?.id ?? (await (await god.request.get("/api/profile")).json()).id
    const others = (await (await god.request.get("/api/users")).json()) as { id: string; company?: { id: string } }[]
    const foreign = others.find((u) => u.company && u.company.id !== "default-company")
    if (godId) expect((await put({ id: godId, password: "nueva123" })).status()).toBe(404)
    if (foreign) expect((await put({ id: foreign.id, password: "nueva123" })).status()).toBe(404)
    await god.close()

    // Lo normal sigue funcionando: editar el nombre de alguien de su equipo
    expect((await put({ id: cashier.id, name: "Cajero Principal" })).status()).toBe(200)

    // Gestor y cajero no administran usuarios
    for (const [email, password] of [["gerente@hermes.com", "gerente123"], ["cajero@hermes.com", "cajero123"]]) {
      const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const p = await ctx.newPage()
      await login(p, email, password)
      await expect(p).not.toHaveURL(/\/login/)
      expect((await ctx.request.get("/api/users")).status(), email).toBe(403)
      expect((await ctx.request.put("/api/users", { data: { id: cashier.id, role: "GOD" } })).status(), email).toBe(403)
      await ctx.close()
    }
  })

  test("las rutas de Factus respetan quién configura, quién gestiona facturas y quién solo consulta", async ({ browser }) => {
    const as = async (email: string, password: string) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const page = await context.newPage()
      await login(page, email, password)
      await expect(page).not.toHaveURL(/\/login/)
      return context
    }
    const settings = [
      ["GET", "/api/factus/settings"], ["GET", "/api/factus/company-ranges"], ["GET", "/api/factus/numbering-ranges"],
      ["GET", "/api/factus/credits/transactions"], ["DELETE", "/api/factus/pending-bills"],
    ] as const

    // Cajero: consulta facturas, pero no configura, no compra créditos ni gestiona
    const cashier = await as("cajero@hermes.com", "cajero123")
    expect((await cashier.request.get("/api/factus/invoices")).status()).toBe(200)
    expect((await cashier.request.get("/api/factus/credits")).status()).toBe(200)
    expect((await cashier.request.get("/api/factus/diagnose-pending")).status()).toBe(200)
    for (const [method, url] of settings) expect((await cashier.request.fetch(url, { method })).status(), `cajero ${method} ${url}`).toBe(403)
    expect((await cashier.request.post("/api/factus/invoices", { data: {} })).status()).toBe(403)
    expect((await cashier.request.patch("/api/factus/invoices/x", { data: { action: "resend" } })).status()).toBe(403)
    expect((await cashier.request.post("/api/factus/credits", { data: { quantity: 5 } })).status()).toBe(403)
    expect((await cashier.request.post("/api/factus/credits/transactions", { data: { companyId: "default-company", amount: 5 } })).status()).toBe(403)
    expect((await cashier.request.post("/api/invoicing/retry")).status()).toBe(403)
    await cashier.close()

    // Gestor: gestiona facturas, pero ya no cambia la configuración ni las credenciales de Factus
    const manager = await as("gerente@hermes.com", "gerente123")
    expect((await manager.request.get("/api/factus/invoices")).status()).toBe(200)
    expect((await manager.request.patch("/api/factus/invoices/no-existe", { data: { action: "resend" } })).status()).toBe(404)
    for (const [method, url] of settings) expect((await manager.request.fetch(url, { method })).status(), `gestor ${method} ${url}`).toBe(403)
    expect((await manager.request.put("/api/factus/settings", { data: { credentials: { clientId: "a", clientSecret: "b", username: "c", password: "d" } } })).status()).toBe(403)
    await manager.close()
  })
})
