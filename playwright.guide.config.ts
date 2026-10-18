import { defineConfig } from "@playwright/test"

/**
 * Graba los videos de la guía de uso (ver tests/guide/README.md).
 * Igual que las E2E, escribe datos reales: apúntala SOLO a una base de pruebas.
 */
const PORT = Number(process.env.E2E_PORT ?? 3101)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests/guide",
  testMatch: /.*\.guide\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL: BASE_URL, locale: "es-CO", actionTimeout: 15_000 },
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
          ENCRYPTION_KEY: process.env.E2E_ENCRYPTION_KEY ?? "dGVzdC1rZXktdGVzdC1rZXktdGVzdC1rZXktMTIzNDU=",
          CRON_SECRET: process.env.E2E_CRON_SECRET ?? "e2e-cron-secret",
          FACTUS_API_URL: "https://api-sandbox.factus.com.co",
        },
      },
})
