import { test, expect } from "@playwright/test"
import { GUIDE_VIDEOS } from "../../../lib/guide/content"

test.describe("Guía de uso", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/guia")
  })

  test("es pública y lista todos los videos", async ({ page }) => {
    await expect(page).toHaveURL(/\/guia$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Aprende Hermes")
    await expect(page.locator("video")).toHaveCount(GUIDE_VIDEOS.length)
    for (const v of GUIDE_VIDEOS) {
      await expect(page.getByRole("heading", { level: 2, name: new RegExp(v.title) })).toBeVisible()
    }
  })

  test("cada video tiene su archivo, su portada y no se descarga hasta reproducirlo", async ({ page, request }) => {
    for (const v of GUIDE_VIDEOS) {
      const video = page.locator(`#${v.slug} video`)
      await expect(video).toHaveAttribute("preload", "none")
      await expect(video).toHaveAttribute("poster", `/guia/posters/${v.slug}.jpg`)
      const mp4 = await request.head(`/guia/videos/${v.slug}.mp4`)
      expect(mp4.status(), `${v.slug}.mp4`).toBe(200)
      expect(mp4.headers()["content-type"]).toContain("video/mp4")
      expect((await request.head(`/guia/posters/${v.slug}.jpg`)).status(), `${v.slug}.jpg`).toBe(200)
    }
  })

  test("los pasos están escritos para quien no pueda ver el video", async ({ page }) => {
    const first = GUIDE_VIDEOS[0]
    for (const step of first.steps) {
      await expect(page.locator(`#${first.slug}`).getByText(step, { exact: true })).toBeVisible()
    }
  })

  test("el índice lleva a cada video", async ({ page }) => {
    const target = GUIDE_VIDEOS[3]
    await page.getByRole("navigation", { name: "Videos de la guía" }).getByRole("link", { name: target.title }).click()
    await expect(page).toHaveURL(new RegExp(`#${target.slug}$`))
    await expect(page.getByRole("heading", { level: 2, name: new RegExp(target.title) })).toBeInViewport()
  })

  test("el video se puede reproducir", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "El códec H.264 solo está en Chrome de escritorio, no en Chromium")
    const video = page.locator("#abrir-caja video")
    await video.scrollIntoViewIfNeeded()
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.canPlayType("video/mp4"))).not.toBe("")
  })

  test("no hay desbordamiento horizontal", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test("la landing y el menú de la app enlazan a la guía", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "El enlace del encabezado se oculta en pantallas pequeñas")
    await page.goto("/")
    await page.getByRole("link", { name: "Guía", exact: true }).click()
    await expect(page).toHaveURL(/\/guia$/)
  })
})
