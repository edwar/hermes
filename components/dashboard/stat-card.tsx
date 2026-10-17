import { cn } from "@/lib/utils"

export interface StatCell {
  label: string
  value: string
  detail: string
  /** Estado del dato: solo se colorea cuando significa algo. */
  tone?: "default" | "warning"
}

/**
 * Franja de estado del turno: una sola superficie dividida por líneas de 1px,
 * en vez de cuatro tarjetas iguales.
 */
export function StatStrip({ cells }: { cells: StatCell[] }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-4 [&>div]:border-border [&>div:nth-child(odd)]:border-r lg:[&>div]:border-r lg:[&>div:last-child]:border-r-0 max-lg:[&>div:nth-child(-n+2)]:border-b">
      {cells.map((cell) => (
        <div key={cell.label} className="px-5 py-4">
          <dt className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {cell.label}
          </dt>
          <dd
            className={cn(
              "mt-2 font-mono text-[28px] leading-none font-semibold tracking-tight tabular-nums",
              cell.tone === "warning" && "text-warning"
            )}
          >
            {cell.value}
          </dd>
          <p className="mt-2 text-xs text-muted-foreground">{cell.detail}</p>
        </div>
      ))}
    </dl>
  )
}
