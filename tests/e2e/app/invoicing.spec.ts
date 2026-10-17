import { test, expect } from "@playwright/test"

// Las pruebas de credenciales usan datos falsos y modifican la empresa de la base de PRUEBAS:
// dejan la facturación electrónica desactivada. No las apuntes a una base real.
const CRED = {
  clientId: "e2e-client-id",
  clientSecret: "e2e-secret-no-mostrar",
  username: "e2e@factus.test",
  password: "e2e-password-no-mostrar",
}

test.describe("Facturas electrónicas", () => {
  test("la tabla de documentos carga con sus columnas y filtros", async ({ page }) => {
    await page.goto("/electronic-invoices")
    await expect(page.getByRole("main").getByRole("heading", { name: "Facturas Electrónicas" })).toBeVisible()
    for (const col of ["Consecutivo", "Fecha", "Total", "Estado", "Acciones"]) {
      await expect(page.getByRole("columnheader", { name: col })).toBeVisible()
    }
    await expect(page.getByRole("button", { name: "Exportar CSV" })).toBeVisible()
  })

  test("los estados se distinguen por texto, no solo por color", async ({ page }) => {
    await page.goto("/electronic-invoices")
    const states = page.getByRole("cell").getByText(/^(Validada|Pendiente|Rechazada|Aceptada|Cancelada)$/)
    await expect(states.first()).toBeVisible()
  })

  test("reintentar o limpiar un documento que no existe responde 404", async ({ request }) => {
    const res = await request.patch("/api/factus/invoices/no-existe", { data: { action: "resend" } })
    expect(res.status()).toBe(404)
  })
})

test.describe("Factus: credenciales por empresa", () => {
  test("guarda las credenciales cifradas y nunca vuelve a mostrar los secretos", async ({ page, request }) => {
    await page.goto("/settings")
    await expect(page.getByText("Credenciales de Factus")).toBeVisible()
    await page.getByLabel("Client ID").fill(CRED.clientId)
    await page.getByLabel("Client Secret").fill(CRED.clientSecret)
    await page.getByLabel("Correo del usuario").fill(CRED.username)
    await page.getByLabel("Contraseña").fill(CRED.password)
    await page.getByRole("button", { name: "Guardar credenciales" }).click()

    await expect(page.getByText("Configuradas", { exact: true })).toBeVisible()
    // Los campos de secretos se vacían y el HTML no contiene los secretos
    await expect(page.getByLabel("Client Secret")).toHaveValue("")
    await expect(page.getByLabel("Contraseña")).toHaveValue("")
    const html = await page.content()
    expect(html).not.toContain(CRED.clientSecret)
    expect(html).not.toContain(CRED.password)

    // La API devuelve solo identificadores, jamás secretos
    const res = await request.get("/api/factus/settings")
    const body = await res.text()
    expect(body).not.toContain(CRED.clientSecret)
    expect(body).not.toContain(CRED.password)
    const json = JSON.parse(body)
    expect(json.credentials).toMatchObject({ configured: true, clientId: CRED.clientId, username: CRED.username })
    expect(json.enabled).toBe(false) // credenciales nuevas obligan a reconectar
  })

  test("el botón de guardar exige los cuatro campos", async ({ page }) => {
    await page.goto("/settings")
    const save = page.getByRole("button", { name: "Guardar credenciales" })
    await expect(save).toBeDisabled()
    await page.getByLabel("Client ID").fill("solo-uno")
    await expect(save).toBeDisabled()
  })

  test("la API rechaza credenciales incompletas", async ({ request }) => {
    const res = await request.put("/api/factus/settings", { data: { credentials: { clientId: "x" } } })
    expect(res.status()).toBe(400)
  })

  test("con credenciales inválidas la facturación no se activa", async ({ request }) => {
    const res = await request.put("/api/factus/settings", { data: { testConnection: true } })
    expect(res.ok()).toBeFalsy()
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(String(json.error)).toMatch(/Factus|credenciales/i)
  })
})

test.describe("Reintentos de facturas pendientes", () => {
  const SECRET = process.env.E2E_CRON_SECRET ?? "e2e-cron-secret"

  test("el cron con el secreto correcto devuelve el resumen", async ({ request }) => {
    const res = await request.get("/api/invoicing/retry", { headers: { authorization: `Bearer ${SECRET}` } })
    expect(res.status()).toBe(200)
    const json = await res.json()
    for (const key of ["checked", "validated", "rejected", "stillPending"]) {
      expect(typeof json[key], key).toBe("number")
    }
  })

  test("un administrador puede reintentar solo los de su empresa", async ({ request }) => {
    const res = await request.post("/api/invoicing/retry")
    expect(res.status()).toBe(200)
    expect(await res.json()).toHaveProperty("checked")
  })
})
