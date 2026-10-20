import type { Metadata } from "next"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { DocViewer } from "@/components/docs/doc-viewer"
import { parseMarkdown } from "@/lib/docs/markdown-lite"

// Página interna, solo del administrador de plataforma y sin enlace en el menú: muestra docs/primer-cliente.md.
// next.config.ts incluye ese archivo en el despliegue (outputFileTracingIncludes).
export const metadata: Metadata = { title: "Primer cliente", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default async function PrimerClientePage() {
  const source = await readFile(join(process.cwd(), "docs", "primer-cliente.md"), "utf8")
  return <DocViewer doc="primer-cliente" blocks={parseMarkdown(source)} />
}
