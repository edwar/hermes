import { test, expect } from "@playwright/test"
import { GUIDE_VIDEOS, guidesFor } from "../../../lib/guide/content"
import media from "../../../lib/guide/media.json"

const mediaBySlug = media as Record<string, { file?: string }>
const fileOf = (slug: string) => mediaBySlug[slug]?.file ?? slug
const PUBLIC_VIDEOS = guidesFor(null)

test.describe("Guía de uso", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/guia")
  })

  test("es pública y lista todos los videos", async ({ page }) => {
    await expect(page).toHaveURL(/\/guia$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Aprende a usar Hermes")
    await expect(page.locator("video")).toHaveCount(PUBLIC_VIDEOS.length)
    for (const v of PUBLIC_VIDEOS) {
      await expect(page.getByRole("heading", { level: 3, name: new RegExp(v.title) })).toBeVisible()
    }
  })

  test("cada video tiene su archivo, su portada y no se descarga hasta reproducirlo", async ({ page, request }) => {
    for (const v of PUBLIC_VIDEOS) {
      const video = page.locator(`#${v.slug} video`)
      await expect(video).toHaveAttribute("preload", "none")
      await expect(video).toHaveAttribute("poster", `/guia/posters/${fileOf(v.slug)}.jpg`)
      const mp4 = await request.head(`/guia/videos/${fileOf(v.slug)}.mp4`)
      expect(mp4.status(), `${v.slug}.mp4`).toBe(200)
      expect(mp4.headers()["content-type"]).toContain("video/mp4")
      expect((await request.head(`/guia/posters/${fileOf(v.slug)}.jpg`)).status(), `${v.slug}.jpg`).toBe(200)
    }
  })

  test("los pasos están escritos para quien no pueda ver el video", async ({ page }) => {
    const first = PUBLIC_VIDEOS[0]
    await page.locator(`#${first.slug} summary`).click()
    for (const step of first.steps) {
      await expect(page.locator(`#${first.slug}`).getByText(step, { exact: true })).toBeVisible()
    }
  })

  test("el índice lleva a cada video", async ({ page, isMobile }) => {
    const target = PUBLIC_VIDEOS[3]
    if (isMobile) await page.getByText("Índice de videos").click()
    const nav = page.getByRole("navigation", { name: isMobile ? "Videos de la guía (móvil)" : "Videos de la guía", exact: true })
    await nav.getByRole("link", { name: target.title }).click()
    await expect(page).toHaveURL(new RegExp(`#${target.slug}$`))
    await expect(page.getByRole("heading", { level: 3, name: new RegExp(target.title) })).toBeInViewport()
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

  test("sin sesión no se muestran ni se enlazan los videos de plataforma", async ({ page }) => {
    const restricted = GUIDE_VIDEOS.filter((v) => v.section === "PLATAFORMA")
    expect(restricted.length).toBeGreaterThan(0)
    for (const v of restricted) {
      await expect(page.locator(`#${v.slug}`)).toHaveCount(0)
      expect(await page.content()).not.toContain(fileOf(v.slug))
    }
    await expect(page.getByTestId("guide-audience")).toContainText("Inicia sesión")
  })
})
