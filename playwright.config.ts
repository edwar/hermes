import { defineConfig, devices } from "@playwright/test"

/**
 * Pruebas E2E de Hermes.
 *
 * Escriben datos reales (ventas, productos, sesiones de caja), así que SIEMPRE deben apuntar a una
 * base de pruebas, nunca a producción. Con webServer, el servidor arranca con E2E_DATABASE_URL y
 * no con el DATABASE_URL de .env. Ver tests/e2e/README.md.
 */
const PORT = Number(process.env.E2E_PORT ?? 3101)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests/e2e",
  // Las pruebas comparten una base de datos y una caja abierta: se ejecutan en serie.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "es-CO",
    timezoneId: "America/Bogota",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "public",
      testMatch: /public\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "public-mobile",
      testMatch: /public\/.*\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "app",
      testMatch: /app\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/admin.json" },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.E2E_SERVER_CMD ?? `pnpm exec next dev -p ${PORT}`,
        url: `${BASE_URL}/login`,
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          DATABASE_URL: process.env.E2E_DATABASE_URL ?? "",
          AUTH_URL: BASE_URL,
          NEXT_PUBLIC_SITE_URL: BASE_URL,
          // Llave y secreto solo para pruebas; nunca las de producción.
          ENCRYPTION_KEY: process.env.E2E_ENCRYPTION_KEY ?? "dGVzdC1rZXktdGVzdC1rZXktdGVzdC1rZXktMTIzNDU=",
          CRON_SECRET: process.env.E2E_CRON_SECRET ?? "e2e-cron-secret",
        },
      },
})

if (!process.env.E2E_DATABASE_URL && !process.env.E2E_BASE_URL) {
  // Falla pronto y con un mensaje claro en vez de arrancar contra el .env de producción.
  console.warn(
    "\n[e2e] Falta E2E_DATABASE_URL. Si ya tienes un servidor de pruebas corriendo, define E2E_BASE_URL; " +
      "si no, define E2E_DATABASE_URL con una base de pruebas (rama de Neon).\n"
  )
}
