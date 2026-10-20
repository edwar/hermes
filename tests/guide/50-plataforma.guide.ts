import { expect, test } from "@playwright/test"
import { recordGuide } from "./lib/recorder"
import { clearPermissionRules, clearPlatformFactusConfig, restoreFactusSandbox, video } from "./lib/fixtures"

test.describe.configure({ mode: "serial" })

const link = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name, exact: true })

test("50 panel-de-plataforma", async ({ browser }) => {
  await restoreFactusSandbox()
  await recordGuide(
    browser,
    video("panel-de-plataforma"),
    async (g) => {
      const { page } = g
      await page.goto("/notifications")
      await g.step(async () => {
        await g.click(link(page, "Panel GOD"))
        await expect(page.getByText("Con Factus", { exact: true })).toBeVisible({ timeout: 20_000 })
      })
      await g.step(async () => g.point(page.getByText("Empresas", { exact: true }).first()))
      await g.step(async () => {
        const pending = page.getByText(/pendientes de activación/i).first()
        await expect(pending).toBeVisible()
        await g.point(pending)
      })
      await g.step(async () => g.point(page.getByRole("button", { name: "Revisar" }).first()))
      await g.step(async () => {
        const all = page.getByText("Todas las Empresas", { exact: true })
        await all.scrollIntoViewIfNeeded()
        await g.point(all)
      })
    },
    { auth: "god" }
  )
})

test("51 empresas", async ({ browser }) => {
  await restoreFactusSandbox()
  await recordGuide(
    browser,
    video("empresas"),
    async (g) => {
      const { page } = g
      await page.goto("/god-dashboard")
      await g.step(async () => {
        await g.click(link(page, "Empresas"))
        await expect(page.getByPlaceholder("Buscar empresa...")).toBeVisible({ timeout: 20_000 })
      })
      await g.step(async () => {
        await g.type(page.getByPlaceholder("Buscar empresa..."), "Tienda")
        await g.pause(700)
      })
      await g.step(async () => g.point(page.getByRole("columnheader", { name: "Factus" })))
      await g.step(async () => {
        await g.click(link(page, "Panel GOD"))
        await g.click(page.getByRole("button", { name: "Revisar" }).first())
      })
      await g.step(async () => {
        await expect(page.getByText(/Créditos Factus/i).first()).toBeVisible({ timeout: 20_000 })
        await g.point(page.getByText("Ventas del Mes"))
      })
      await g.step(async () => {
        await g.click(page.getByRole("tab", { name: "Factus" }))
        const activate = page.getByRole("button", { name: "Activar", exact: true })
        await expect(activate).toBeVisible()
        await g.type(page.getByPlaceholder("Cantidad"), "20")
        await g.click(activate)
        await g.pause(1500)
      })
    },
    { auth: "god" }
  )
})

test("52 invitaciones", async ({ browser }) => {
  await recordGuide(
    browser,
    video("invitaciones"),
    async (g) => {
      const { page } = g
      await page.goto("/god-dashboard")
      await g.step(async () => {
        await g.click(link(page, "Invitaciones"))
        await expect(page.getByRole("button", { name: "Nueva Invitación" })).toBeVisible({ timeout: 20_000 })
      })
      await g.step(async () => g.point(page.getByRole("columnheader", { name: "Estado" })))
      await g.step(async () => g.click(page.getByRole("button", { name: "Nueva Invitación" })))
      const dialog = page.getByRole("dialog", { name: "Nueva Invitación" })
      await g.step(async () => {
        await g.type(dialog.locator("#companyName"), "Ferretería El Tornillo")
        await g.type(dialog.locator("#email"), "dueno@eltornillo.co")
      })
      await g.step(async () => {
        await g.click(dialog.getByRole("button", { name: "Crear invitación" }))
        await expect(page.getByRole("dialog", { name: "Invitación creada" })).toBeVisible({ timeout: 20_000 })
      })
      await g.step(async () => {
        const created = page.getByRole("dialog", { name: "Invitación creada" })
        await g.click(created.locator("button").filter({ has: page.locator("svg.lucide-copy") }))
        await g.pause(1500)
        await g.click(created.getByRole("button", { name: "Cerrar", exact: true }))
      })
    },
    { auth: "god" }
  )
})

test("53 creditos-factus", async ({ browser }) => {
  await recordGuide(
    browser,
    video("creditos-factus"),
    async (g) => {
      const { page } = g
      await page.goto("/god-dashboard")
      await g.step(async () => {
        await g.click(link(page, "Transacciones Factus"))
        await expect(page.getByRole("heading", { name: "Transacciones Factus" }).first()).toBeVisible({ timeout: 20_000 })
      })
      await g.step(async () => {
        await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 })
        await g.point(page.locator("tbody tr").first())
      })
      await g.step(async () => {
        await g.click(page.getByRole("combobox").first())
        await g.point(page.getByRole("option", { name: "Compras" }))
        await g.click(page.getByRole("option", { name: "Compras" }))
      })
      await g.step(async () => g.pause(1800))
      await g.step(async () => {
        await g.click(page.getByRole("combobox").first())
        await g.click(page.getByRole("option", { name: "Consumos" }))
        await g.pause(1200)
      })
      await g.step(async () => g.point(page.getByRole("button", { name: "Exportar CSV" })))
    },
    { auth: "god" }
  )
})

test("54 auditoria", async ({ browser }) => {
  await recordGuide(
    browser,
    video("auditoria"),
    async (g) => {
      const { page } = g
      await page.goto("/god-dashboard")
      await g.step(async () => {
        await g.click(link(page, "Auditoría"))
        await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 })
      })
      await g.step(async () => g.point(page.locator("tbody tr").first()))
      await g.step(async () => {
        await g.click(page.getByRole("combobox").first())
        await g.click(page.getByRole("option").nth(2))
      })
      await g.step(async () => g.point(page.getByPlaceholder("Filtrar por usuario...")))
      await g.step(async () => {
        await g.click(page.getByRole("button", { name: "Actualizar" }))
        await g.pause(1200)
      })
    },
    { auth: "god" }
  )
})

test("55 configuracion-del-sistema", async ({ browser }) => {
  await recordGuide(
    browser,
    video("configuracion-del-sistema"),
    async (g) => {
      const { page } = g
      await page.goto("/god-dashboard")
      await g.step(async () => {
        await g.click(link(page, "Config. Sistema"))
        await expect(page.locator("#inviteExpiryHours")).toBeVisible({ timeout: 20_000 })
      })
      await g.step(async () => g.point(page.locator("#inviteExpiryHours")))
      await g.step(async () => g.point(page.locator("#thresholdLow")))
      await g.step(async () => {
        await g.point(page.locator("#thresholdMedium"))
        await g.point(page.locator("#thresholdHigh"))
      })
      await g.step(async () => {
        await g.click(page.getByRole("button", { name: "Guardar Todo" }))
        await g.pause(1500)
      })
    },
    { auth: "god" }
  )
})

test("56 factus-de-la-plataforma", async ({ browser }) => {
  await clearPlatformFactusConfig()
  await recordGuide(
    browser,
    video("factus-de-la-plataforma"),
    async (g) => {
      const { page } = g
      await page.goto("/god-dashboard")
      await g.step(async () => {
        await g.click(link(page, "Config. Sistema"))
        const title = page.getByText("Factus de la plataforma", { exact: true }).first()
        await expect(title).toBeVisible({ timeout: 30_000 })
        await title.scrollIntoViewIfNeeded()
        await g.point(page.locator("#factus-api-url"))
      })
      await g.step(async () => {
        await g.click(page.getByRole("button", { name: "Producción", exact: true }))
        await g.pause(500)
      })
      await g.step(async () => {
        await g.point(page.getByText(/Al cambiar de API se descartan los tokens/).first())
        // Se vuelve a Sandbox sin guardar: esto es solo una demostración
        await g.click(page.getByRole("button", { name: "Sandbox", exact: true }))
      })
      await g.step(async () => {
        await g.type(page.locator("#platform-client-id"), "ejemplo-client-id")
        await g.type(page.locator("#platform-client-secret"), "ejemplo-secreto")
        await g.type(page.locator("#platform-username"), "cuenta-de-pruebas@correo.co")
        await g.type(page.locator("#platform-password"), "ejemplo-clave")
        await g.click(page.getByRole("button", { name: "Guardar credenciales" }))
        await expect(page.getByText("Configurada", { exact: true })).toBeVisible({ timeout: 20_000 })
      })
      await g.step(async () => g.point(page.getByRole("button", { name: "Probar conexión" })))
    },
    { auth: "god" }
  )
  await clearPlatformFactusConfig()
})

test("57 permisos-de-plataforma", async ({ browser }) => {
  await clearPermissionRules()
  await recordGuide(
    browser,
    video("permisos-de-plataforma"),
    async (g) => {
      const { page } = g
      await page.goto("/god-dashboard")
      await g.step(async () => {
        await g.click(link(page, "Config. Sistema"))
        const title = page.getByText("Permisos por rol", { exact: true }).first()
        await expect(title).toBeVisible({ timeout: 30_000 })
        await g.point(title)
      })
      await g.step(async () => {
        await g.click(page.getByRole("combobox", { name: "Aplicar a" }))
        await g.click(page.getByRole("option", { name: "Tienda Doña Rosa" }))
      })
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
    { auth: "god" }
  )
  await clearPermissionRules()
})
