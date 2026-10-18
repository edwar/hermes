import { expect, test } from "@playwright/test"
import { recordGuide } from "./lib/recorder"
import { video } from "./lib/fixtures"
import { request } from "@playwright/test"
import { AUTH_FILES } from "./lib/recorder"

test("90 registro-con-invitacion", async ({ browser }) => {
  // El GOD crea la invitación (sin grabar); el video empieza al abrir el enlace, sin sesión.
  const godApi = await request.newContext({
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3101}`,
    storageState: AUTH_FILES.god,
  })
  const created = await godApi.post("/api/invites", { data: { companyName: "Panadería La Espiga" } })
  expect(created.ok(), await created.text()).toBeTruthy()
  const invite = await created.json()
  const inviteUrl: string = invite.inviteUrl ?? `/register?token=${invite.token}`
  await godApi.dispose()
  const path = inviteUrl.startsWith("http") ? new URL(inviteUrl).pathname + new URL(inviteUrl).search : inviteUrl
  const email = `dueno.${Math.floor(1000 + Math.random() * 9000)}@laespiga.co`

  await recordGuide(
    browser,
    video("registro-con-invitacion"),
    async (g) => {
      const { page } = g
      await page.goto("/login")
      await g.step(async () => {
        await page.goto(path)
        await expect(page.locator("#token")).toBeVisible()
      })
      await g.step(async () => g.point(page.locator("#token")))
      await g.step(async () => {
        await g.type(page.locator("#email"), email)
        await g.type(page.locator("#name"), "Carlos Pardo")
      })
      await g.step(async () => {
        await g.type(page.locator("#password"), "Espiga2026")
        await g.type(page.locator("#confirmPassword"), "Espiga2026")
      })
      await g.step(async () => g.click(page.getByRole("button", { name: "Crear cuenta" })))
      await g.step(async () => {
        await expect(page.getByText("¡Registro exitoso!")).toBeVisible({ timeout: 30_000 })
        await g.point(page.getByText("¡Registro exitoso!"))
      })
    },
    { auth: "none" }
  )
})
