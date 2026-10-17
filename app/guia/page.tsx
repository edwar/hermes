import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { Wordmark } from "@/components/shared/wordmark"
import { buttonVariants } from "@/components/ui/button"
import { GUIDE_VIDEOS } from "@/lib/guide/content"
import media from "@/lib/guide/media.json"

export const metadata: Metadata = {
  title: "Guía de uso",
  description:
    "Aprende a usar Hermes en el mostrador con videos cortos: abrir la caja, vender y cobrar, productos por peso, factura electrónica, devoluciones y cierre.",
  alternates: { canonical: "/guia" },
}

const WHATSAPP_URL = "https://wa.me/573175227672?text=Hola,%20tengo%20una%20duda%20sobre%20Hermes"
const durations = media as Record<string, { duration: number; bytes: number }>

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, "0")
  return `${m}:${s}`
}

export default function GuidePage() {
  const total = GUIDE_VIDEOS.reduce((n, v) => n + (durations[v.slug]?.duration ?? 0), 0)

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Hermes, inicio">
            <Wordmark />
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Guía de uso · {GUIDE_VIDEOS.length} videos · {Math.round(total / 60)} min
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Aprende Hermes en el mostrador
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Videos cortos, sin sonido, que siguen el turno de un cajero de principio a fin. Cada paso también está
            escrito debajo. Los datos que ves son de ejemplo.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="Videos de la guía" className="lg:sticky lg:top-24 lg:self-start">
            <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-l lg:border-border lg:pb-0">
              {GUIDE_VIDEOS.map((v, i) => (
                <li key={v.slug} className="shrink-0">
                  <a
                    href={`#${v.slug}`}
                    className="flex items-baseline gap-3 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground lg:rounded-none lg:border-0 lg:px-4"
                  >
                    <span className="font-mono text-xs text-faint">{i + 1}</span>
                    <span className="whitespace-nowrap lg:whitespace-normal">{v.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-14">
            {GUIDE_VIDEOS.map((v, i) => {
              const m = durations[v.slug]
              return (
                <section key={v.slug} id={v.slug} aria-labelledby={`${v.slug}-title`} className="scroll-mt-24">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 id={`${v.slug}-title`} className="text-2xl font-semibold tracking-tight">
                      <span className="mr-3 font-mono text-base font-normal text-faint">{i + 1}</span>
                      {v.title}
                    </h2>
                    {m && (
                      <span className="shrink-0 rounded-sm bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {formatDuration(m.duration)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 max-w-2xl text-muted-foreground">{v.summary}</p>

                  <div className="mt-5 overflow-hidden rounded-lg border border-border bg-card">
                    <video
                      controls
                      playsInline
                      preload="none"
                      poster={`/guia/posters/${v.slug}.jpg`}
                      aria-label={`Video: ${v.title}`}
                      className="aspect-video w-full bg-background"
                    >
                      <source src={`/guia/videos/${v.slug}.mp4`} type="video/mp4" />
                      Tu navegador no puede reproducir este video. Los pasos están escritos debajo.
                    </video>
                  </div>

                  <details className="mt-4 rounded-lg border border-border bg-card" open={i === 0}>
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                      Ver los pasos escritos
                    </summary>
                    <ol className="space-y-2.5 border-t border-border px-4 py-4 text-[15px] leading-relaxed text-muted-foreground">
                      {v.steps.map((step, n) => (
                        <li key={step} className="flex gap-3">
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-seam-strong font-mono text-[11px] text-foreground">
                            {n + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                </section>
              )
            })}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-5 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">¿Te quedó una duda?</h2>
            <p className="mt-1 text-muted-foreground">Escríbenos y te ayudamos a resolverla.</p>
          </div>
          <Link href={WHATSAPP_URL} target="_blank" className={buttonVariants({ size: "lg" })}>
            Escribir por WhatsApp
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <Wordmark />
          <nav aria-label="Pie" className="flex items-center gap-6">
            <Link href="/" className="transition-colors hover:text-foreground">Inicio</Link>
            <Link href="/login" className="transition-colors hover:text-foreground">Iniciar sesión</Link>
          </nav>
          <p className="font-mono tracking-[0.06em]">HECHO EN COLOMBIA &middot; 2026</p>
        </div>
      </footer>
    </div>
  )
}
