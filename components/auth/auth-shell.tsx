import { Store } from "lucide-react"
import { APP_NAME } from "@/lib/constants"

interface AuthShellProps {
  tagline: string
  children: React.ReactNode
  corner?: React.ReactNode
}

// Ticket de ejemplo: datos sintéticos que muestran el mecanismo del producto.
const SAMPLE_LINES = [
  { name: "Leche Entera 1L", qty: 2, total: "$ 8.400" },
  { name: "Pan Tajado Grande", qty: 1, total: "$ 6.200" },
  { name: "Jugo Hit Tropical 400ml", qty: 3, total: "$ 8.976" },
]

export function AuthShell({ tagline, children, corner }: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-1/2 flex-col justify-between border-r border-border p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md border border-seam-strong bg-elevated">
            <Store className="size-4 text-info" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-[0.14em]">{APP_NAME.toUpperCase()}</span>
        </div>

        <div className="max-w-md space-y-8">
          <div className="space-y-4">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-tight text-balance">{tagline}</h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              POS e inventario gratis. Solo pagas por cada factura electrónica que emites.
            </p>
          </div>

          <figure aria-label="Ejemplo de ticket de venta" className="overflow-hidden rounded-lg border border-border bg-card">
            <figcaption className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">Ticket</span>
              <span className="rounded-sm bg-elevated px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-faint">EJEMPLO</span>
            </figcaption>
            <ul className="divide-y divide-border">
              {SAMPLE_LINES.map((line) => (
                <li key={line.name} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{line.qty}×</span>
                    {line.name}
                  </span>
                  <span className="font-mono tabular-nums">{line.total}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-end justify-between border-t border-border bg-background px-4 py-3">
              <span className="pb-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Total</span>
              <span className="font-mono text-3xl leading-none font-semibold tabular-nums">$ 23.576</span>
            </div>
            <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-xs">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              <span className="text-success">Factura electrónica validada</span>
            </div>
          </figure>
        </div>

        <p className="font-mono text-[11px] tracking-[0.08em] text-faint">
          {APP_NAME.toUpperCase()} &middot; {new Date().getFullYear()}
        </p>
      </aside>

      <main className="relative flex flex-1 items-center justify-center p-4 sm:p-8">
        {corner && <div className="absolute top-4 right-4">{corner}</div>}
        {children}
      </main>
    </div>
  )
}
