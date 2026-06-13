"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, GripVertical, Loader2, Banknote, RefreshCw } from "lucide-react"
import { sileo } from "sileo"
import { formatCOP } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface Denomination {
  id: string
  value: number
  label: string
  sortOrder: number
  isActive: boolean
}

export function DenominationSettings() {
  const [denominations, setDenominations] = useState<Denomination[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addValue, setAddValue] = useState("")
  const [addLabel, setAddLabel] = useState("")
  const [saving, setSaving] = useState(false)

  async function fetchDenominations() {
    try {
      const res = await fetch("/api/cash-denominations")
      if (res.ok) setDenominations(await res.json())
    } catch {
      sileo.error({ title: "Error al cargar denominaciones" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDenominations() }, [])

  async function handleAdd() {
    const value = parseFloat(addValue)
    if (isNaN(value) || value <= 0 || !addLabel.trim()) return
    setSaving(true)
    try {
      const result = await apiFetch<Record<string, unknown>>("/api/cash-denominations", {
        method: "POST",
        body: { value, label: addLabel.trim() },
        resource: "cash-denominations",
      })
      if (result.ok) {
        sileo.success({ title: result.queued ? "Denominación encolada: se agregará al reconectar" : "Denominación agregada" })
        setAddOpen(false)
        setAddValue("")
        setAddLabel("")
        if (!result.queued) fetchDenominations()
      } else {
        sileo.error({ title: result.error || "Error al agregar" })
      }
    } catch {
      sileo.error({ title: "Error al agregar" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const result = await apiFetch<Record<string, unknown>>(`/api/cash-denominations?id=${id}`, {
        method: "DELETE",
        resource: "cash-denominations",
        entityId: id,
        mockResponse: (_body, cid) => ({ id, clientId: cid, deleted: true }),
      })
      if (result.ok) {
        sileo.success({ title: result.queued ? "Eliminación encolada" : "Denominación eliminada" })
        if (!result.queued) fetchDenominations()
      }
    } catch {
      sileo.error({ title: "Error al eliminar" })
    }
  }

  async function handleToggle(denom: Denomination) {
    try {
      const result = await apiFetch<Record<string, unknown>>("/api/cash-denominations", {
        method: "PUT",
        body: { id: denom.id, isActive: !denom.isActive },
        resource: "cash-denominations",
        entityId: denom.id,
      })
      if (result.ok && !result.queued) fetchDenominations()
    } catch {
      sileo.error({ title: "Error al actualizar" })
    }
  }

  const COLOMBIAN_DEFAULTS = [
    { value: 50, label: "$50" },
    { value: 100, label: "$100" },
    { value: 200, label: "$200" },
    { value: 500, label: "$500" },
    { value: 1000, label: "$1.000" },
    { value: 2000, label: "$2.000" },
    { value: 5000, label: "$5.000" },
    { value: 10000, label: "$10.000" },
    { value: 20000, label: "$20.000" },
    { value: 50000, label: "$50.000" },
    { value: 100000, label: "$100.000" },
  ]

  async function seedDefaults() {
    setSaving(true)
    try {
      for (const d of COLOMBIAN_DEFAULTS) {
        await apiFetch<Record<string, unknown>>("/api/cash-denominations", {
          method: "POST",
          body: d,
          resource: "cash-denominations",
        }).catch(() => {})
      }
      sileo.success({ title: "Denominaciones por defecto agregadas" })
      fetchDenominations()
    } catch {
      sileo.error({ title: "Error al crear denominaciones" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <Card>
      <CardContent className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="size-4 text-primary" />
            Denominaciones de efectivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Define los montos de monedas y billetes que aparecerán en el POS para agilizar el cobro en efectivo.
          </p>

          {denominations.length === 0 && (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground space-y-3">
              <p>No hay denominaciones configuradas.</p>
              <Button variant="outline" size="sm" onClick={seedDefaults} disabled={saving}>
                {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : <RefreshCw className="mr-1 size-4" />}
                Agregar denominaciones de Colombia
              </Button>
            </div>
          )}

          {denominations.length > 0 && (
            <div className="space-y-1">
              {denominations.map((denom) => (
                <div
                  key={denom.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-2.5"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="size-4 text-muted-foreground/40 shrink-0" />
                    <span className={`font-mono tabular-nums text-sm font-medium ${!denom.isActive ? "text-muted-foreground line-through" : ""}`}>
                      {formatCOP(denom.value)}
                    </span>
                    <span className="text-xs text-muted-foreground">{denom.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(denom)}
                      className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                        denom.isActive
                          ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {denom.isActive ? "Activo" : "Inactivo"}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(denom.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 size-4" /> Agregar denominación
          </Button>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Agregar denominación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="denom-value">Valor</Label>
              <Input
                id="denom-value"
                type="number"
                min="1"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                placeholder="Ej: 50000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="denom-label">Etiqueta</Label>
              <Input
                id="denom-label"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                placeholder="Ej: $50.000"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setAddOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={saving || !addValue || !addLabel.trim()} className="w-full sm:w-auto">
              {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Agregando...</> : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
