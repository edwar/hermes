"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export interface GuideIndexGroup {
  section: string
  videos: { slug: string; title: string; n: number }[]
}

/** Distancia desde el borde superior a partir de la cual un video cuenta como el que se está viendo. */
const ACTIVE_OFFSET = 140

/**
 * Índice de la guía. Resalta el video que se está viendo y, cuando el índice tiene scroll propio,
 * lo mantiene a la vista para que los últimos enlaces siempre se alcancen.
 */
export function GuideIndex({ groups }: { groups: GuideIndexGroup[] }) {
  const slugs = groups.flatMap((g) => g.videos.map((v) => v.slug))
  const [active, setActive] = useState<string | null>(slugs[0] ?? null)
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      let current = slugs[0] ?? null
      for (const slug of slugs) {
        const el = document.getElementById(slug)
        if (el && el.getBoundingClientRect().top <= ACTIVE_OFFSET) current = slug
      }
      setActive(atBottom ? (slugs[slugs.length - 1] ?? null) : current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs.join("|")])

  // Si el índice tiene scroll propio, lleva el enlace activo a la vista sin mover la página.
  useEffect(() => {
    const nav = listRef.current?.parentElement
    const link = active ? listRef.current?.querySelector<HTMLElement>(`a[href="#${active}"]`) : null
    if (!nav || !link || nav.scrollHeight <= nav.clientHeight) return
    const top = link.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop
    if (top < nav.scrollTop + 24) nav.scrollTop = Math.max(0, top - 24)
    else if (top + link.offsetHeight > nav.scrollTop + nav.clientHeight - 24)
      nav.scrollTop = top + link.offsetHeight - nav.clientHeight + 24
  }, [active])

  return (
    <ol ref={listRef} className="space-y-5">
      {groups.map((g) => (
        <li key={g.section}>
          <p className="px-4 pb-1.5 font-mono text-[10px] font-medium tracking-[0.1em] text-faint">{g.section}</p>
          <ul className="border-l border-border">
            {g.videos.map(({ slug, title, n }) => {
              const isActive = slug === active
              return (
                <li key={slug}>
                  <a
                    href={`#${slug}`}
                    aria-current={isActive ? "location" : undefined}
                    onClick={() => setActive(slug)}
                    className={cn(
                      "-ml-px flex items-baseline gap-3 border-l-2 px-4 py-1.5 text-sm transition-colors hover:bg-elevated hover:text-foreground",
                      isActive
                        ? "border-info bg-elevated font-medium text-foreground"
                        : "border-transparent text-muted-foreground"
                    )}
                  >
                    <span className={cn("w-5 font-mono text-xs", isActive ? "text-info" : "text-faint")}>{n}</span>
                    <span>{title}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ol>
  )
}
