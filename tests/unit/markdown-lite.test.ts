import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { countCheckboxes, parseInline, parseMarkdown, plain, slugify, type Block } from "@/lib/docs/markdown-lite"
import { PLATFORM_MODULES } from "@/lib/permissions/resolve"

const paragraph = (b: Block) => (b.type === "paragraph" ? b.inline : [])
const items = (b: Block) => (b.type === "list" ? b.items : [])

describe("lector de Markdown mínimo", () => {
  it("entiende títulos, párrafos, viñetas y casillas", () => {
    const blocks = parseMarkdown(["# Título", "", "Un párrafo", "que sigue.", "", "## Sección", "", "- viñeta", "- [ ] casilla", "- [x] hecha", "", "---"].join("\n"))
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "heading", "list", "rule"])
    expect(blocks[0]).toMatchObject({ type: "heading", level: 1, text: "Título", id: "titulo" })
    expect(plain(paragraph(blocks[1]))).toBe("Un párrafo que sigue.")
    expect(items(blocks[3]).map((i) => i.checked)).toEqual([null, false, true])
    expect(countCheckboxes(blocks)).toBe(2)
  })

  it("separa negrita y código del texto, y permite código dentro de una negrita", () => {
    expect(parseInline("a **b** c `d` e")).toEqual([
      { kind: "text", text: "a " }, { kind: "text", text: "b", bold: true }, { kind: "text", text: " c " },
      { kind: "code", text: "d" }, { kind: "text", text: " e" },
    ])
    expect(parseInline("sin formato")).toEqual([{ kind: "text", text: "sin formato" }])
    expect(parseInline("**Nunca cambies `CLAVE` ya**")).toEqual([
      { kind: "text", text: "Nunca cambies ", bold: true }, { kind: "code", text: "CLAVE", bold: true }, { kind: "text", text: " ya", bold: true },
    ])
  })

  it("las casillas tienen clave estable por texto, y distinta si el texto se repite", () => {
    const a = parseMarkdown("- [ ] uno\n- [ ] dos")
    const b = parseMarkdown("- [ ] dos\n- [ ] uno") // otro orden, mismas claves
    const keys = (blocks: Block[]) => Object.fromEntries(items(blocks[0]).map((i) => [plain(i.inline), i.key]))
    expect(keys(a)).toEqual(keys(b))
    const dup = items(parseMarkdown("- [ ] igual\n- [ ] igual")[0])
    expect(dup[0].key).not.toBe(dup[1].key)
  })

  it("slugify quita tildes y signos", () => {
    expect(slugify("1. Antes de abrirle la puerta")).toBe("1-antes-de-abrirle-la-puerta")
  })
})

describe("docs/primer-cliente.md", () => {
  const blocks = parseMarkdown(readFileSync("docs/primer-cliente.md", "utf8"))

  it("tiene título, las cinco secciones y un listado de casillas", () => {
    const headings = blocks.filter((b) => b.type === "heading")
    expect(headings.filter((h) => h.level === 1)).toHaveLength(1)
    expect(headings.filter((h) => h.level === 2)).toHaveLength(5)
    expect(countCheckboxes(blocks)).toBeGreaterThanOrEqual(25)
  })

  it("las claves de las casillas no se repiten y no quedan marcas de formato sin convertir", () => {
    const items = blocks.flatMap((b) => (b.type === "list" ? b.items : []))
    const keys = items.map((i) => i.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const item of items) expect(plain(item.inline), plain(item.inline)).not.toMatch(/\*\*|`/)
  })

  it("la página es solo del administrador de plataforma", () => {
    expect(PLATFORM_MODULES).toContain("/primer-cliente")
  })
})
