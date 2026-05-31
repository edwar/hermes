"use client"

import { useState } from "react"
import { Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OpenSessionDialog } from "@/components/cajas/open-session-dialog"

interface SessionBlockerOverlayProps {
  onSessionOpened: () => void
}

export function SessionBlockerOverlay({ onSessionOpened }: SessionBlockerOverlayProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center -m-6">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
          <Wallet className="size-10 text-primary" />
        </div>
        <h2 className="mb-2 text-xl font-bold">Sesión de caja requerida</h2>
        <p className="mb-8 text-sm text-muted-foreground">
          No hay una caja abierta. Debes abrir una caja registradora antes de poder realizar ventas.
        </p>
        <Button size="lg" onClick={() => setDialogOpen(true)}>
          <Wallet className="mr-2 size-5" />
          Abrir Caja
        </Button>
      </div>

      <OpenSessionDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={onSessionOpened} />
    </div>
  )
}
