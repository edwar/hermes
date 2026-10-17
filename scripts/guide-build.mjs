#!/usr/bin/env node
/**
 * Convierte las grabaciones de la guía (guide-videos/raw/*.webm) en archivos listos para publicar:
 *   public/guia/videos/<slug>.mp4     H.264 720p, sin audio, con faststart (empieza a reproducir sin bajar todo)
 *   public/guia/posters/<slug>.jpg    portada tomada a un tercio del video
 *   lib/guide/media.json              duración y peso de cada video (lo lee la página /guia)
 *
 * Requiere ffmpeg y ffprobe en el PATH.   Uso: pnpm guide:build
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"

const RAW = "guide-videos/raw"
const OUT_VIDEOS = "public/guia/videos"
const OUT_POSTERS = "public/guia/posters"
const MEDIA_JSON = "lib/guide/media.json"

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
}

try {
  run("ffmpeg", ["-version"])
} catch {
  console.error("No se encontró ffmpeg. Instálalo (brew install ffmpeg) y vuelve a intentar.")
  process.exit(1)
}

if (!existsSync(RAW)) {
  console.error(`No hay grabaciones en ${RAW}. Ejecuta primero: pnpm guide:record`)
  process.exit(1)
}

mkdirSync(OUT_VIDEOS, { recursive: true })
mkdirSync(OUT_POSTERS, { recursive: true })

const media = {}
const files = readdirSync(RAW).filter((f) => f.endsWith(".webm")).sort()
if (files.length === 0) {
  console.error(`No hay archivos .webm en ${RAW}.`)
  process.exit(1)
}

for (const file of files) {
  const slug = basename(file, ".webm")
  const input = join(RAW, file)
  const mp4 = join(OUT_VIDEOS, `${slug}.mp4`)
  const poster = join(OUT_POSTERS, `${slug}.jpg`)

  run("ffmpeg", [
    "-v", "error", "-y", "-i", input,
    "-vf", "scale=1280:-2,fps=25",
    "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", "-an", mp4,
  ])

  const duration = Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]).trim())
  const at = Math.max(1, Math.min(duration * 0.35, 20)).toFixed(2)
  run("ffmpeg", ["-v", "error", "-y", "-ss", at, "-i", mp4, "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "4", poster])

  media[slug] = { duration: Math.round(duration), bytes: statSync(mp4).size }
  console.log(`${slug}: ${Math.round(duration)} s, ${(media[slug].bytes / 1024 / 1024).toFixed(2)} MB`)
}

writeFileSync(MEDIA_JSON, JSON.stringify(media, null, 2) + "\n")
const total = Object.values(media).reduce((n, m) => n + m.bytes, 0)
console.log(`\n${files.length} videos, ${(total / 1024 / 1024).toFixed(1)} MB en total → ${OUT_VIDEOS}`)
