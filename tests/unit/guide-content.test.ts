import { existsSync, statSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { GUIDE_VIDEOS, getGuideVideo } from "@/lib/guide/content"
import media from "@/lib/guide/media.json"

const mediaBySlug = media as Record<string, { duration: number; bytes: number }>

describe("contenido de la guía", () => {
  it("cada video tiene título, resumen y al menos tres pasos", () => {
    for (const v of GUIDE_VIDEOS) {
      expect(v.title.length, v.slug).toBeGreaterThan(3)
      expect(v.summary.length, v.slug).toBeGreaterThan(20)
      expect(v.steps.length, v.slug).toBeGreaterThanOrEqual(3)
      for (const step of v.steps) expect(step.trim(), `${v.slug}: paso vacío`).not.toBe("")
    }
  })

  it("los identificadores son únicos y aptos para URL", () => {
    const slugs = GUIDE_VIDEOS.map((v) => v.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(getGuideVideo(slugs[0])?.slug).toBe(slugs[0])
    expect(getGuideVideo("no-existe")).toBeUndefined()
  })

  it("los subtítulos son cortos para leerse en pantalla", () => {
    for (const v of GUIDE_VIDEOS) {
      for (const step of v.steps) expect(step.length, `${v.slug}: «${step}»`).toBeLessThanOrEqual(90)
    }
  })
})

describe("archivos de la guía", () => {
  for (const v of GUIDE_VIDEOS) {
    it(`${v.slug}: tiene video, portada y duración`, () => {
      const video = `public/guia/videos/${v.slug}.mp4`
      const poster = `public/guia/posters/${v.slug}.jpg`
      expect(existsSync(video), `falta ${video}; ejecuta pnpm guide:record y pnpm guide:build`).toBe(true)
      expect(existsSync(poster), `falta ${poster}`).toBe(true)
      expect(statSync(video).size).toBeGreaterThan(50_000)
      expect(mediaBySlug[v.slug]?.duration, `media.json sin ${v.slug}`).toBeGreaterThan(5)
    })
  }

  it("el peso total de los videos es razonable para servirlos desde la app", () => {
    const total = Object.values(mediaBySlug).reduce((n, m) => n + m.bytes, 0)
    expect(total).toBeLessThan(40 * 1024 * 1024)
  })
})
