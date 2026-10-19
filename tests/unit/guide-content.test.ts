import { existsSync, statSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { GUIDE_VIDEOS, getGuideVideo, guidesFor } from "@/lib/guide/content"
import { NAV_ACCESS } from "@/lib/navigation"
import media from "@/lib/guide/media.json"

const mediaBySlug = media as Record<string, { duration: number; bytes: number; file?: string }>

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

describe("guía por rol", () => {
  it("cada módulo del menú tiene al menos una guía", () => {
    // Módulos sin enlace propio en el menú: los cubre el video de su pantalla (Movimientos de Inventario, Facturas electrónicas).
    const noMenuLink = ["/stock-movements", "/electronic-invoices/manage", "/permissions"]
    for (const href of Object.keys(NAV_ACCESS).filter((h) => !noMenuLink.includes(h))) {
      expect(GUIDE_VIDEOS.some((v) => v.href === href), `${href} no tiene guía`).toBe(true)
    }
  })

  it("el GOD ve todo y sin sesión no se ve la plataforma", () => {
    expect(guidesFor("GOD")).toHaveLength(GUIDE_VIDEOS.length)
    expect(guidesFor(null).some((v) => v.section === "PLATAFORMA")).toBe(false)
  })

  it("cada rol ve solo guías de módulos a los que tiene acceso", () => {
    for (const role of ["OWNER", "ADMIN", "MANAGER", "CASHIER"]) {
      for (const v of guidesFor(role)) {
        if (v.href) expect(NAV_ACCESS[v.href] as readonly string[], `${role} → ${v.slug}`).toContain(role)
      }
      expect(guidesFor(role).some((v) => v.section === "PLATAFORMA"), role).toBe(false)
    }
  })
})

describe("archivos de la guía", () => {
  for (const v of GUIDE_VIDEOS) {
    it(`${v.slug}: tiene video, portada y duración`, () => {
      const file = mediaBySlug[v.slug]?.file ?? v.slug
      const video = `public/guia/videos/${file}.mp4`
      const poster = `public/guia/posters/${file}.jpg`
      expect(existsSync(video), `falta ${video}; ejecuta pnpm guide:record y pnpm guide:build`).toBe(true)
      expect(existsSync(poster), `falta ${poster}`).toBe(true)
      expect(statSync(video).size).toBeGreaterThan(50_000)
      expect(mediaBySlug[v.slug]?.duration, `media.json sin ${v.slug}`).toBeGreaterThan(5)
    })
  }

  it("los videos restringidos no usan un nombre predecible", () => {
    for (const v of GUIDE_VIDEOS.filter((x) => x.section === "PLATAFORMA")) {
      expect(mediaBySlug[v.slug]?.file, `${v.slug} debe tener sufijo aleatorio`).toMatch(new RegExp(`^${v.slug}-[0-9a-f]{10}$`))
    }
    for (const v of GUIDE_VIDEOS.filter((x) => x.section !== "PLATAFORMA")) {
      expect(mediaBySlug[v.slug]?.file, `${v.slug} no necesita sufijo`).toBeUndefined()
    }
  })

  it("el peso total de los videos es razonable para servirlos desde la app", () => {
    const total = Object.values(mediaBySlug).reduce((n, m) => n + m.bytes, 0)
    expect(total).toBeLessThan(40 * 1024 * 1024)
  })
})
