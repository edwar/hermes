import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { Wordmark } from "@/components/shared/wordmark"
import { GuideIndex } from "@/components/docs/guide-index"
import { buttonVariants } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { groupBySection, guidesForModules, ROLE_LABELS, type GuideSection } from "@/lib/guide/content"
import { modulesFor } from "@/lib/permissions"
import media from "@/lib/guide/media.json"
import type { Role } from "@/lib/navigation"

export const metadata: Metadata = {
  title: "Guía de uso",
  description:
    "Aprende a usar Hermes con videos cortos: vender y cobrar, inventario, compras, reportes, cajas, usuarios y facturación electrónica.",
  alternates: { canonical: "/guia" },
}

const WHATSAPP_URL = "https://wa.me/573175227672?text=Hola,%20tengo%20una%20duda%20sobre%20Hermes"

type Media = { duration: number; bytes: number; file?: string }
const mediaBySlug = media as Record<string, Media>

const SECTION_NOTES: Record<GuideSection, string> = {
  "PRIMEROS PASOS": "Para empezar",
  "OPERACIÓN": "El día a día en el mostrador",
  "CATÁLOGO": "Productos, clientes y proveedores",
  "CONTROL": "Reportes, cajas, equipo y configuración",
  "PLATAFORMA": "Administración de la plataforma",
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, "0")
  return `${m}:${s}`
}

export default async function GuidePage() {
  // Sin sesión se ve la guía de negocio; con sesión, solo lo que el rol puede usar; el GOD ve todo.
  const session = await auth()
  const role = session?.user?.role ?? null
  const modules = session?.user
    ? await modulesFor({ userId: session.user.id, role: session.user.role, companyId: session.user.companyId })
    : []
  const videos = guidesForModules(role, modules).filter((v) => mediaBySlug[v.slug])
  const groups = groupBySection(videos)
  const totalSeconds = videos.reduce((n, v) => n + mediaBySlug[v.slug].duration, 0)
  const roleLabel = role ? (ROLE_LABELS[role as Role] ?? role) : null

  let position = 0
  const numbered = groups.map((g) => ({
    ...g,
    videos: g.videos.map((v) => ({ video: v, n: ++position })),
  }))

  const index = (
    <GuideIndex
      groups={numbered.map((g) => ({
        section: g.section,
        videos: g.videos.map(({ video, n }) => ({ slug: video.slug, title: video.title, n })),
      }))}
    />
  )

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Hermes, inicio">
            <Wordmark />
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {session?.user ? (
              <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Ir a la aplicación
              </Link>
            ) : (
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Iniciar sesión
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Guía de uso · {videos.length} videos · {Math.max(1, Math.round(totalSeconds / 60))} min
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Aprende a usar Hermes</h1>
          {roleLabel ? (
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground" data-testid="guide-audience">
              Esta es la guía para tu rol: <strong className="font-semibold text-foreground">{roleLabel}</strong>.
              {role === "GOD"
                ? " Como administrador de plataforma ves todas las guías."
                : " Solo aparece lo que puedes usar con tu acceso."}{" "}
              Los datos que ves en los videos son de ejemplo.
            </p>
          ) : (
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground" data-testid="guide-audience">
              Videos cortos, sin sonido, que recorren cada módulo de Hermes. Cada paso también está escrito debajo.{" "}
              <Link href="/login" className="text-info underline-offset-4 hover:underline">
                Inicia sesión
              </Link>{" "}
              para ver solo las guías de tu rol. Los datos que ves son de ejemplo.
            </p>
          )}
        </div>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
          <div>
            <details className="rounded-lg border border-border bg-card lg:hidden">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Índice de videos</summary>
              <nav aria-label="Videos de la guía (móvil)" className="border-t border-border py-4">
                {index}
              </nav>
            </details>
            <nav aria-label="Videos de la guía" className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
              {index}
            </nav>
          </div>

          <div className="space-y-16">
            {numbered.map((g) => (
              <section key={g.section} aria-labelledby={`sec-${g.section}`} className="space-y-12">
                <div className="border-b border-border pb-3">
                  <h2 id={`sec-${g.section}`} className="font-mono text-[11px] font-medium tracking-[0.1em] text-muted-foreground">
                    {g.section}
                  </h2>
                  <p className="mt-1 text-xl font-semibold tracking-tight">{SECTION_NOTES[g.section]}</p>
                </div>

                {g.videos.map(({ video: v, n }) => {
                  const m = mediaBySlug[v.slug]
                  const file = m.file ?? v.slug
                  return (
                    <article key={v.slug} id={v.slug} aria-labelledby={`${v.slug}-title`} className="scroll-mt-24">
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 id={`${v.slug}-title`} className="text-2xl font-semibold tracking-tight">
                          <span className="mr-3 font-mono text-base font-normal text-faint">{n}</span>
                          {v.title}
                        </h3>
                        <span className="shrink-0 rounded-sm bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                          {formatDuration(m.duration)}
                        </span>
                      </div>
                      <p className="mt-2 max-w-2xl text-muted-foreground">{v.summary}</p>

                      <div className="mt-5 overflow-hidden rounded-lg border border-border bg-card">
                        <video
                          controls
                          playsInline
                          preload="none"
                          poster={`/guia/posters/${file}.jpg`}
                          aria-label={`Video: ${v.title}`}
                          className="aspect-video w-full bg-background"
                        >
                          <source src={`/guia/videos/${file}.mp4`} type="video/mp4" />
                          Tu navegador no puede reproducir este video. Los pasos están escritos debajo.
                        </video>
                      </div>

                      <details className="mt-4 rounded-lg border border-border bg-card">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Ver los pasos escritos</summary>
                        <ol className="space-y-2.5 border-t border-border px-4 py-4 text-[15px] leading-relaxed text-muted-foreground">
                          {v.steps.map((step, i) => (
                            <li key={step} className="flex gap-3">
                              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-seam-strong font-mono text-[11px] text-foreground">
                                {i + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </details>
                    </article>
                  )
                })}
              </section>
            ))}
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
            <Link href={session?.user ? "/dashboard" : "/login"} className="transition-colors hover:text-foreground">
              {session?.user ? "Ir a la aplicación" : "Iniciar sesión"}
            </Link>
          </nav>
          <p className="font-mono tracking-[0.06em]">HECHO EN COLOMBIA &middot; 2026</p>
        </div>
      </footer>
    </div>
  )
}
