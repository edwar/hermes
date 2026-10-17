import { Store } from "lucide-react"

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-md border border-seam-strong bg-elevated">
        <Store className="size-4 text-info" />
      </span>
      <span className="font-mono text-sm font-semibold tracking-[0.14em]">HERMES</span>
    </span>
  )
}
