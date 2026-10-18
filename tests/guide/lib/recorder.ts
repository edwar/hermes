import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { type Browser, type Locator, type Page } from "@playwright/test"
import { isRestricted, type GuideVideo } from "../../../lib/guide/content"
import { installOverlay } from "./overlay"

export const RAW_DIR = "guide-videos/raw"
export const META_DIR = "guide-videos/meta"
export const AUTH_FILES = {
  admin: "tests/guide/.auth/admin.json",
  god: "tests/guide/.auth/god.json",
} as const
export const AUTH_FILE = AUTH_FILES.admin
/** Con quién se graba el video: administrador de la empresa, administrador de plataforma o sin sesión. */
export type GuideAuth = keyof typeof AUTH_FILES | "none"
const SIZE = { width: 1280, height: 720 }
/**
 * Eventos por movimiento del cursor. Con un diálogo abierto (fondo desenfocado) cada evento tarda cientos de ms
 * en confirmarse; pocos pasos + la transición CSS del overlay dan el mismo movimiento fluido.
 */
const MOVE_STEPS = 10

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

export async function recordGuide(
  browser: Browser,
  video: GuideVideo,
  body: (g: Guide) => Promise<void>,
  options: { auth?: GuideAuth } = {}
) {
  const auth = options.auth ?? "admin"
  mkdirSync(RAW_DIR, { recursive: true })
  mkdirSync(META_DIR, { recursive: true })
  // El script de conversión lo lee para nombrar sin predicción los videos restringidos.
  writeFileSync(join(META_DIR, `${video.slug}.json`), JSON.stringify({ slug: video.slug, restricted: isRestricted(video) }))
  const context = await browser.newContext({
    storageState: auth === "none" ? undefined : AUTH_FILES[auth],
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

  const timed = async <T,>(label: string, fn: () => Promise<T>) => {
    const t0 = Date.now()
    try {
      return await fn()
    } finally {
      const ms = Date.now() - t0
      if (ms > 4000) console.log(`[${video.slug}]   lento (${(ms / 1000).toFixed(1)} s): ${label}`)
    }
  }

  const guide: Guide = {
    page,
    pause: (ms) => page.waitForTimeout(ms),
    async point(target) {
      const { x, y } = await center(target)
      await page.mouse.move(x, y, { steps: MOVE_STEPS })
      await page.waitForTimeout(500)
    },
    async click(target) {
      const { x, y } = await timed(`center ${target}`, () => center(target))
      await timed("mouse.move", () => page.mouse.move(x, y, { steps: MOVE_STEPS }))
      await page.waitForTimeout(280)
      await timed(`click ${target}`, () => target.click())
      await page.waitForTimeout(450)
    },
    async type(target, text) {
      await guide.click(target)
      // Reemplaza el valor que ya traiga el campo (por ejemplo, un 30 % de ganancia por defecto).
      await target.press("ControlOrMeta+A")
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
      console.log(`[${video.slug}] ${new Date().toISOString().slice(14, 19)} paso ${index}/${total}: ${text}`)
      await setCaption(index, text)
      const read = readTime(text)
      await page.waitForTimeout(Math.round(read * 0.45))
      await action()
      await page.waitForTimeout(Math.round(read * 0.55))
    },
  }

  try {
    await page.waitForTimeout(800)
    try {
      await body(guide)
    } catch (error) {
      // Una captura del momento del fallo ahorra horas de adivinar qué había en pantalla.
      mkdirSync("test-results", { recursive: true })
      await page.screenshot({ path: join("test-results", `guia-fallo-${video.slug}.png`) }).catch(() => {})
      throw error
    }
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
