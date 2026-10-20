// Lector de Markdown mínimo para los documentos internos de docs/: títulos (#, ##, ###), párrafos, listas
// con viñetas, listas de casillas (- [ ]), **negrita**, `código` y ---. No es un Markdown completo a propósito:
// evita una dependencia nueva para un documento que controlamos nosotros.

/** `bold`: el fragmento va en negrita (puede ser texto o código dentro de una negrita). */
export type Inline = { kind: "text" | "code"; text: string; bold?: boolean }

export interface ListItem {
  /** null: viñeta normal. false/true: casilla (marcada o no en el documento). */
  checked: boolean | null
  inline: Inline[]
  /** Identificador estable para recordar la casilla: depende del texto, no de la posición. */
  key: string
}

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string; id: string }
  | { type: "paragraph"; inline: Inline[] }
  | { type: "list"; items: ListItem[] }
  | { type: "rule" }

export function parseInline(text: string, bold = false): Inline[] {
  const out: Inline[] = []
  const mark = (part: Inline): Inline => (bold ? { ...part, bold: true } : part)
  // Una negrita puede llevar código dentro (**no cambies `CLAVE`**); el código no lleva negrita dentro.
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  for (const match of text.matchAll(re)) {
    const at = match.index ?? 0
    if (at > last) out.push(mark({ kind: "text", text: text.slice(last, at) }))
    const token = match[0]
    if (token.startsWith("**")) out.push(...parseInline(token.slice(2, -2), true))
    else out.push(mark({ kind: "code", text: token.slice(1, -1) }))
    last = at + token.length
  }
  if (last < text.length) out.push(mark({ kind: "text", text: text.slice(last) }))
  return out
}

/** Texto plano de un fragmento con formato. */
export const plain = (inline: Inline[]) => inline.map((i) => i.text).join("")

function hash(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = []
  const seen = new Map<string, number>()
  let paragraph: string[] = []
  let list: ListItem[] | null = null

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", inline: parseInline(paragraph.join(" ")) })
    paragraph = []
  }
  const flushList = () => {
    if (list?.length) blocks.push({ type: "list", items: list })
    list = null
  }

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      const text = heading[2].trim()
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text, id: slugify(text) })
      continue
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph()
      flushList()
      blocks.push({ type: "rule" })
      continue
    }

    const item = /^-\s+(?:\[([ xX])\]\s+)?(.*)$/.exec(line)
    if (item) {
      flushParagraph()
      list ??= []
      const checked = item[1] === undefined ? null : item[1] !== " "
      const inline = parseInline(item[2])
      // Dos casillas con el mismo texto (raro) no deben compartir clave.
      const base = hash(plain(inline))
      const count = (seen.get(base) ?? 0) + 1
      seen.set(base, count)
      list.push({ checked, inline, key: count === 1 ? base : `${base}-${count}` })
      continue
    }

    flushList()
    paragraph.push(line.trim())
  }
  flushParagraph()
  flushList()
  return blocks
}

/** Cuántas casillas tiene el documento. */
export function countCheckboxes(blocks: Block[]): number {
  return blocks.reduce((n, b) => n + (b.type === "list" ? b.items.filter((i) => i.checked !== null).length : 0), 0)
}
