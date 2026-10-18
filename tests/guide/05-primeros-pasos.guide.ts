import { test } from "@playwright/test"
import { recordGuide } from "./lib/recorder"
import { video } from "./lib/fixtures"

test.describe.configure({ mode: "serial" })

test("05 perfil-y-contrasena", async ({ browser }) => {
  await recordGuide(browser, video("perfil-y-contrasena"), async (g) => {
    const { page } = g
    await page.goto("/dashboard")
    await g.step(async () => g.click(page.getByRole("banner").getByText("Admin").first()))
    await g.step(async () => g.click(page.getByRole("menuitem", { name: "Perfil" })))
    await g.step(async () => g.point(page.locator("#name")))
    await g.step(async () => {
      // Se escribe pero no se guarda: la contraseña del usuario de demostración no debe cambiar.
      await g.type(page.getByPlaceholder("••••••••").first(), "clave-actual")
      await g.type(page.getByPlaceholder("Mínimo 6 caracteres"), "NuevaClave2026")
      await g.type(page.getByPlaceholder("Repite la nueva contraseña"), "NuevaClave2026")
    })
    await g.step(async () => g.point(page.getByRole("button", { name: "Cambiar contraseña" })))
  })
})
