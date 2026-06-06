"use client"

import { useState } from "react"
import { Wallet, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OpenSessionDialog } from "@/components/cajas/open-session-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface SessionConflictInfo {
  sessionId: string
  activeUser?: string
  activeDevice?: string
}

interface SessionBlockerOverlayProps {
  onSessionOpened: () => void
  onConflict?: (info: { sessionId: string; activeUser?: string; activeDevice?: string }) => void
}

export function SessionBlockerOverlay({ onSessionOpened, onConflict }: SessionBlockerOverlayProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [conflictInfo, setConflictInfo] = useState<SessionConflictInfo | null>(null)

  function handleConflict(info: SessionConflictInfo) {
    setConflictInfo(info)
    setDialogOpen(false) // Cerrar el diálogo de abrir caja
    setConflictOpen(true) // Mostrar el modal de conflicto
  }

  function handleConflictClose() {
    setConflictOpen(false)
    setConflictInfo(null)
    setDialogOpen(true) // Reabrir el diálogo de abrir caja
  }

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

      <OpenSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={onSessionOpened}
        onConflict={handleConflict}
      />

      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">Caja ya abierta</DialogTitle>
            <DialogDescription className="text-center">
              {conflictInfo?.activeUser
                ? `Esta caja está siendo usada por ${conflictInfo.activeUser}`
                : "Esta caja ya está abierta en otro dispositivo"}
              {conflictInfo?.activeDevice && (
                <span className="block mt-1 text-xs font-mono">
                  Dispositivo: {conflictInfo.activeDevice}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
            Cierra la sesión en el otro dispositivo antes de abrir una nueva.
          </div>
          <DialogFooter>
            <Button onClick={handleConflictClose} className="w-full">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
