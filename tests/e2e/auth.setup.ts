import { test as setup, expect } from "@playwright/test"
import { login } from "./helpers"

setup("iniciar sesión como administrador", async ({ page }) => {
  await login(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await page.context().storageState({ path: "tests/e2e/.auth/admin.json" })
})
