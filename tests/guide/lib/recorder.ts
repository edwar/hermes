import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { type Browser, type Locator, type Page } from "@playwright/test"
import type { GuideVideo } from "../../../lib/guide/content"
import { installOverlay } from "./overlay"

export const RAW_DIR = "guide-videos/raw"
export const AUTH_FILE = "tests/guide/.auth/admin.json"
const SIZE = { width: 1280, height: 720 }

/** Funciones que instala el overlay (tests/guide/lib/overlay.ts) en la página grabada. */
type GuideWindow = Window & {
  __guideCaption?: (step: number, total: number, text: string | null) => void
  __guideKey?: (label: string) => void
}

export interface Guide {
  page: Page
  /** Muestra el subtítulo del siguiente paso, ejecuta la acción y deja tiempo para leer. */
  step(action: () => Promise<void>): Promise<void>
  /** Mueve el cursor, hace clic y deja ver el anillo. */
  click(target: Locator): Promise<void>
  /** Hace clic y escribe despacio, como una persona. */
  type(target: Locator, text: string): Promise<void>
  /** Pulsa una tecla y la muestra en pantalla. */
  press(key: string, label?: string): Promise<void>
  /** Mueve el cursor sin hacer clic (para señalar algo). */
  point(target: Locator): Promise<void>
  pause(ms: number): Promise<void>
}

const readTime = (text: string) => Math.min(6000, Math.max(2600, 1800 + text.length * 48))

export async function recordGuide(browser: Browser, video: GuideVideo, body: (g: Guide) => Promise<void>) {
  mkdirSync(RAW_DIR, { recursive: true })
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: SIZE,
    recordVideo: { dir: join(RAW_DIR, ".tmp"), size: SIZE },
    locale: "es-CO",
    timezoneId: "America/Bogota",
    colorScheme: "dark",
    permissions: ["clipboard-read", "clipboard-write"],
    deviceScaleFactor: 1,
  })
  await installOverlay(context)
  const page = await context.newPage()

  let index = 0
  const total = video.steps.length
  const setCaption = (n: number, text: string | null) =>
    page.evaluate(([s, t, x]) => (window as GuideWindow).__guideCaption?.(s, t, x), [n, total, text] as const).catch(() => {})

  const center = async (target: Locator) => {
    await target.scrollIntoViewIfNeeded()
    const box = await target.boundingBox()
    if (!box) throw new Error("El elemento no tiene caja visible")
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }

  const guide: Guide = {
    page,
    pause: (ms) => page.waitForTimeout(ms),
    async point(target) {
      const { x, y } = await center(target)
      await page.mouse.move(x, y, { steps: 28 })
      await page.waitForTimeout(500)
    },
    async click(target) {
      const { x, y } = await center(target)
      await page.mouse.move(x, y, { steps: 28 })
      await page.waitForTimeout(280)
      await target.click()
      await page.waitForTimeout(450)
    },
    async type(target, text) {
      await guide.click(target)
      await target.pressSequentially(text, { delay: 85 })
      await page.waitForTimeout(400)
    },
    async press(key, label) {
      await page.evaluate((l) => (window as GuideWindow).__guideKey?.(l), label ?? key.toUpperCase()).catch(() => {})
      await page.waitForTimeout(350)
      await page.keyboard.press(key)
      await page.waitForTimeout(500)
    },
    async step(action) {
      const text = video.steps[index]
      if (text === undefined) throw new Error(`${video.slug}: hay más pasos grabados que subtítulos`)
      index += 1
      await setCaption(index, text)
      const read = readTime(text)
      await page.waitForTimeout(Math.round(read * 0.45))
      await action()
      await page.waitForTimeout(Math.round(read * 0.55))
    },
  }

  try {
    await page.waitForTimeout(800)
    await body(guide)
    if (index !== total) throw new Error(`${video.slug}: se grabaron ${index} pasos y hay ${total} subtítulos`)
    await setCaption(0, "Listo")
    await page.waitForTimeout(1600)
    await setCaption(0, null)
    await page.waitForTimeout(500)
  } finally {
    const recorded = page.video()
    // Si el cuerpo falló, no se debe tapar ese error con uno del cierre.
    await context.close().catch(() => {})
    await recorded?.saveAs(join(RAW_DIR, `${video.slug}.webm`)).catch(() => {})
  }
}
