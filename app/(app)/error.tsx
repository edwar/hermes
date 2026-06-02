"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[App Error]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h2 className="mb-2 font-sans text-2xl font-bold">Algo salió mal</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Ocurrió un error inesperado al cargar esta sección.
        </p>
        {error.digest && (
          <p className="mb-6 font-mono text-xs text-muted-foreground/70">
            Código: {error.digest}
          </p>
        )}
        <Button onClick={reset} className="mt-4">
          <RefreshCw className="mr-2 size-4" />
          Reintentar
        </Button>
      </div>
    </div>
  )
}
