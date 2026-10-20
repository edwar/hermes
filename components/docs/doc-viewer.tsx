"use client"

import { Fragment, useEffect, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { countCheckboxes, type Block, type Inline } from "@/lib/docs/markdown-lite"

const storageKey = (doc: string) => `hermes:doc:${doc}`

function readChecked(doc: string): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(doc)) ?? "{}")
  } catch {
    return {}
  }
}

function Text({ inline }: { inline: Inline[] }) {
  return (
    <>
      {inline.map((part, i) =>
        part.kind === "code" ? (
          <code key={i} className={cn("rounded-sm bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-foreground", part.bold && "font-semibold")}>{part.text}</code>
        ) : part.bold ? (
          <strong key={i} className="font-semibold text-foreground">{part.text}</strong>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        )
      )}
    </>
  )
}

/**
 * Muestra un documento de docs/ ya convertido a bloques. Las casillas se recuerdan en este navegador
 * (localStorage, por documento): sirven para ir marcando un listado mientras se verifica.
 */
export function DocViewer({ doc, blocks }: { doc: string; blocks: Block[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const total = countCheckboxes(blocks)
  const done = Object.values(checked).filter(Boolean).length

  useEffect(() => {
    // La lectura va en un efecto porque localStorage no existe al renderizar en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(readChecked(doc))
  }, [doc])

  function toggle(key: string, value: boolean) {
    setChecked((prev) => {
      const next = { ...prev, [key]: value }
      try {
        window.localStorage.setItem(storageKey(doc), JSON.stringify(next))
      } catch {
        // Sin almacenamiento (ventana privada): la casilla funciona hasta que se recargue la página.
      }
      return next
    })
  }

  function reset() {
    setChecked({})
    try {
      window.localStorage.removeItem(storageKey(doc))
    } catch {
      // ignorar
    }
  }

  return (
    <article className="mx-auto max-w-3xl space-y-4 pb-16">
      {total > 0 && (
        <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-1 py-3 backdrop-blur-sm">
          <p className="font-mono text-xs text-muted-foreground" aria-live="polite" data-testid="doc-progress">
            {done} de {total} verificados
          </p>
          <Button variant="ghost" size="sm" onClick={reset} disabled={done === 0}>
            Desmarcar todo
          </Button>
        </div>
      )}

      {blocks.map((block, i) => {
        if (block.type === "heading") {
          if (block.level === 1) return <h1 key={i} id={block.id} className="pt-2 text-3xl font-semibold tracking-tight">{block.text}</h1>
          if (block.level === 2) return <h2 key={i} id={block.id} className="border-b border-border pt-8 pb-2 text-xl font-semibold tracking-tight">{block.text}</h2>
          return <h3 key={i} id={block.id} className="pt-4 font-mono text-[11px] font-medium tracking-[0.1em] text-muted-foreground uppercase">{block.text}</h3>
        }
        if (block.type === "rule") return <hr key={i} className="border-border" />
        if (block.type === "paragraph") {
          return <p key={i} className="leading-relaxed text-muted-foreground"><Text inline={block.inline} /></p>
        }
        return (
          <ul key={i} className="space-y-2">
            {block.items.map((item) =>
              item.checked === null ? (
                <li key={item.key} className="flex gap-3 leading-relaxed text-muted-foreground">
                  <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-faint" />
                  <span><Text inline={item.inline} /></span>
                </li>
              ) : (
                <li key={item.key}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md p-1.5 leading-relaxed hover:bg-elevated/60">
                    <Checkbox
                      className="mt-1"
                      checked={checked[item.key] ?? item.checked}
                      onCheckedChange={(value) => toggle(item.key, !!value)}
                    />
                    <span className={cn("text-muted-foreground", checked[item.key] && "text-faint line-through")}>
                      <Text inline={item.inline} />
                    </span>
                  </label>
                </li>
              )
            )}
          </ul>
        )
      })}
    </article>
  )
}
