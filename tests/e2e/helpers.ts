import { expect, type APIRequestContext, type Page } from "@playwright/test"

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@hermes.com",
  password: process.env.E2E_ADMIN_PASSWORD ?? "admin123",
}

/** Inicia sesión por la interfaz. */
export async function login(page: Page, email = ADMIN.email, password = ADMIN.password) {
  await page.goto("/login")
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Iniciar sesión" }).click()
}

/** Cierra la sesión de caja activa (si la hay) para partir de un estado conocido. */
export async function closeActiveCashSession(request: APIRequestContext) {
  const res = await request.get("/api/cash-sessions/active")
  if (!res.ok()) return
  const session = await res.json().catch(() => null)
  if (!session?.id) return
  const closed = await request.put(`/api/cash-sessions/${session.id}/close`, {
    data: { closingBalance: Number(session.openingBalance ?? 0) },
  })
  expect(closed.ok(), "no se pudo cerrar la caja activa").toBeTruthy()
}

/** Abre una caja desde la pantalla de bloqueo del POS. */
export async function openCashSessionFromPos(page: Page, base = "100000") {
  await page.goto("/pos")
  await page.getByRole("button", { name: "Abrir Caja" }).click()
  const dialog = page.getByRole("dialog", { name: "Abrir Caja" })
  await dialog.getByRole("combobox").click()
  await page.getByRole("option").first().click()
  await dialog.locator("#base").fill(base)
  await dialog.getByRole("button", { name: "Abrir Caja" }).click()
  await expect(page.getByText("CAJA ABIERTA")).toBeVisible()
}

/** "$ 14.192" -> 14192 */
export function cop(text: string | null): number {
  return Number((text ?? "").replace(/[^\d]/g, ""))
}
