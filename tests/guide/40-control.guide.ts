import { expect, test } from "@playwright/test"
import { recordGuide } from "./lib/recorder"
import { adminApi, clearPermissionRules, restoreFactusSandbox, video } from "./lib/fixtures"

test.describe.configure({ mode: "serial" })

const link = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name, exact: true })

test("40 reportes", async ({ browser }) => {
  await recordGuide(browser, video("reportes"), async (g) => {
    const { page } = g
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(link(page, "Reportes"))
      await expect(page.getByRole("heading", { name: "Reportes de Ventas" })).toBeVisible()
    })
    const dates = page.getByRole("main").getByRole("button", { name: /de (septiembre|octubre|noviembre|agosto)/ })
    await g.step(async () => {
      await g.click(dates.first())
      await g.pause(1000)
      await page.keyboard.press("Escape")
    })
    await g.step(async () => {
      await g.click(dates.nth(1))
      await g.pause(1000)
      await page.keyboard.press("Escape")
    })
    await g.step(async () => {
      await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 })
      await g.point(page.locator("tbody tr").first())
    })
    await g.step(async () => g.point(page.getByRole("columnheader", { name: "Total" })))
  })
})

test("41 cajas", async ({ browser }) => {
  // Se abre una caja sin grabar para que la pantalla tenga una sesión activa; se cierra al terminar.
  const api = await adminApi()
  const active = await api.get("/api/cash-sessions/active")
  if (!(active.ok() && (await active.json().catch(() => null))?.id)) {
    const registers = await (await api.get("/api/cash-registers")).json()
    const register = (Array.isArray(registers) ? registers : registers.registers).find((r: { isActive: boolean }) => r.isActive)
    const opened = await api.post("/api/cash-sessions", {
      data: { cashRegisterId: register.id, openingBalance: 100000, deviceId: "guia", deviceName: "Guía" },
    })
    expect(opened.ok(), await opened.text()).toBeTruthy()
  }

  await recordGuide(browser, video("cajas"), async (g) => {
    const { page } = g
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(link(page, "Cajas"))
      await expect(page.getByRole("heading", { name: "Sesión activa" })).toBeVisible({ timeout: 20_000 })
    })
    await g.step(async () => g.point(page.getByRole("heading", { name: "Sesión activa" })))
    await g.step(async () => {
      await g.click(page.getByRole("button", { name: "Movimiento" }))
      const dialog = page.getByRole("dialog", { name: "Movimiento de caja" })
      await expect(dialog).toBeVisible()
      await g.click(dialog.getByRole("combobox"))
      await g.click(page.getByRole("option", { name: "Retiro" }))
      await g.type(dialog.locator("#amount"), "20000")
      await g.type(dialog.locator("#reason"), "Pago a un proveedor")
      await g.click(dialog.getByRole("button", { name: "Registrar", exact: true }))
      await expect(dialog).toBeHidden({ timeout: 20_000 })
    })
    await g.step(async () => g.point(page.getByRole("heading", { name: "Historial de sesiones" })))
    await g.step(async () => {
      await g.click(page.getByRole("button", { name: "Nueva caja" }))
      const dialog = page.getByRole("dialog", { name: "Nueva caja" })
      await g.type(dialog.getByPlaceholder("Ej: Caja Principal"), "Caja Mostrador 2")
      await g.pause(900)
      await g.click(dialog.getByRole("button", { name: "Cancelar" }))
    })
  })

  const session = await (await api.get("/api/cash-sessions/active")).json().catch(() => null)
  if (session?.id) await api.put(`/api/cash-sessions/${session.id}/close`, { data: { closingBalance: 80000 } })
  await api.dispose()
})

test("42 configuracion", async ({ browser }) => {
  await recordGuide(browser, video("configuracion"), async (g) => {
    const { page } = g
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(link(page, "Configuración"))
      await expect(page.locator("#companyName")).toBeVisible({ timeout: 20_000 })
    })
    await g.step(async () => {
      await g.type(page.locator("#nit"), "900.123.456-8")
      await g.type(page.locator("#address"), "Calle 1 # 2-3")
      await g.type(page.locator("#phone"), "300 123 4567")
      await g.type(page.locator("#email"), "contacto@tiendarosa.co")
    })
    await g.step(async () => {
      await g.type(page.locator("#storeName"), "Tienda Doña Rosa")
      await g.point(page.locator("#taxRate"))
    })
    await g.step(async () => g.type(page.locator("#receiptFooter"), "¡Gracias por su compra! Vuelva pronto."))
    await g.step(async () => {
      await g.click(page.getByRole("button", { name: "Guardar", exact: true }))
      await g.pause(1500)
    })
  })
})

test("43 configuracion-facturacion", async ({ browser }) => {
  // Parte de una empresa sin credenciales: el video cuenta cómo conectarla por primera vez
  await restoreFactusSandbox()
  await recordGuide(browser, video("configuracion-facturacion"), async (g) => {
    const { page } = g
    await page.goto("/settings")
    await expect(page.locator("#factus-client-id")).toBeVisible({ timeout: 20_000 })
    await g.step(async () => {
      await page.locator("#factus-client-id").scrollIntoViewIfNeeded()
      await g.point(page.getByText("Credenciales de Factus"))
    })
    await g.step(async () => {
      await g.type(page.locator("#factus-client-id"), "ejemplo-client-id")
      await g.type(page.locator("#factus-client-secret"), "ejemplo-secreto")
    })
    await g.step(async () => {
      await g.type(page.locator("#factus-username"), "tu-usuario@correo.co")
      await g.type(page.locator("#factus-password"), "ejemplo-clave")
    })
    await g.step(async () => {
      await g.click(page.getByRole("button", { name: "Guardar credenciales" }))
      await expect(page.getByText("Configuradas", { exact: true })).toBeVisible({ timeout: 20_000 })
    })
    await g.step(async () => {
      // Con credenciales de ejemplo, Factus las rechaza y la pantalla lo avisa
      // El aviso de "Credenciales guardadas" debe haberse ido: con dos avisos a la vez, el del resultado no se ve
      await expect(page.getByText(/Credenciales guardadas/i)).toBeHidden({ timeout: 15_000 })
      await g.click(page.getByRole("button", { name: "Probar conexión" }))
      await expect(page.getByText(/Error de Factus/i)).toBeVisible({ timeout: 15_000 })
      await g.pause(2500)
    })
    await g.step(async () => g.point(page.getByRole("switch").first()))
    await g.step(async () => {
      const credits = page.getByText(/créditos/i).last()
      await credits.scrollIntoViewIfNeeded()
      await g.point(credits)
    })
  })
  await restoreFactusSandbox()
})

test("46 permisos-del-equipo", async ({ browser }) => {
  await clearPermissionRules()
  await recordGuide(
    browser,
    video("permisos-del-equipo"),
    async (g) => {
      const { page } = g
      await page.goto("/settings")
      const title = page.getByText("Permisos del equipo", { exact: true }).first()
      await expect(title).toBeVisible({ timeout: 30_000 })
      await g.step(async () => {
        await title.scrollIntoViewIfNeeded()
        await g.point(title)
      })
      await g.step(async () => g.point(page.getByRole("columnheader", { name: /Cajero/ })))
      await g.step(async () => g.click(page.getByRole("switch", { name: "Reportes para Cajero" })))
      await g.step(async () => {
        await expect(page.getByRole("row", { name: /Reportes/ }).getByText("Empresa")).toBeVisible()
        await g.point(page.getByRole("row", { name: /Reportes/ }).getByText("Empresa"))
      })
      await g.step(async () => {
        await g.click(page.getByRole("tab", { name: "Por persona" }))
        await g.click(page.getByRole("combobox", { name: "Persona" }))
        await g.click(page.getByRole("option", { name: /Cajero Principal/ }))
        await g.click(page.getByRole("switch", { name: "Inventario para Cajero Principal" }))
      })
      await g.step(async () => {
        await g.click(page.getByRole("button", { name: "Restablecer", exact: true }))
        await g.pause(1200)
      })
    },
    { auth: "owner" }
  )
  await clearPermissionRules()
})

test("44 usuarios", async ({ browser }) => {
  const email = `lucia.ramirez${Math.floor(100 + Math.random() * 900)}@ejemplo.co`
  await recordGuide(browser, video("usuarios"), async (g) => {
    const { page } = g
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(link(page, "Usuarios"))
      await expect(page.getByRole("button", { name: "Nuevo Usuario" })).toBeVisible()
    })
    await g.step(async () => g.click(page.getByRole("button", { name: "Nuevo Usuario" })))
    const dialog = page.getByRole("dialog", { name: "Nuevo Usuario" })
    await g.step(async () => {
      await g.type(dialog.locator("#u-name"), "Lucía Ramírez")
      await g.type(dialog.locator("#u-email"), email)
      await g.type(dialog.locator("#u-pass"), "Clave2026")
    })
    await g.step(async () => {
      await g.click(dialog.getByRole("combobox"))
      await g.point(page.getByRole("option", { name: "Cajero" }))
      await g.click(page.getByRole("option", { name: "Cajero" }))
    })
    await g.step(async () => {
      await g.click(dialog.getByRole("button", { name: "Guardar", exact: true }))
      await expect(dialog).toBeHidden({ timeout: 20_000 })
      await expect(page.getByRole("cell", { name: "Lucía Ramírez" })).toBeVisible()
      await g.point(page.getByRole("row", { name: /Lucía Ramírez/ }))
    })
    await g.step(async () => {
      await g.click(page.getByRole("row", { name: /Lucía Ramírez/ }).getByRole("button"))
      await expect(page.getByRole("dialog", { name: "Editar Usuario" })).toBeVisible()
      await g.pause(1800)
      await page.keyboard.press("Escape")
    })
  })
})

test("45 notificaciones", async ({ browser }) => {
  await recordGuide(browser, video("notificaciones"), async (g) => {
    const { page } = g
    await page.goto("/dashboard")
    await g.step(async () => {
      await g.click(link(page, "Notificaciones"))
      await expect(page.getByRole("heading", { name: "Notificaciones" }).first()).toBeVisible()
    })
    await g.step(async () => g.point(page.locator("tbody tr").first()))
    await g.step(async () => g.point(page.getByRole("banner").locator("button").filter({ has: page.locator("svg.lucide-bell") })))
    await g.step(async () => g.click(page.getByRole("button", { name: "Leer", exact: true }).first()))
    await g.step(async () => g.click(page.getByRole("button", { name: "Marcar todas leídas" })))
  })
})
