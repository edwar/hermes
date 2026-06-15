"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"

export function SystemConfigSettings() {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inviteExpiryHours, setInviteExpiryHours] = useState(168)

  async function fetchData() {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        setInviteExpiryHours(data.inviteExpiryHours ?? 168)
      }
    } catch {
      error("Error al cargar configuración")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function saveGeneralSettings() {
    setSaving(true)
    try {
      const result = await apiFetch<Record<string, unknown>>("/api/settings", {
        method: "PUT",
        body: { inviteExpiryHours },
        resource: "settings",
      })
      if (result.ok) {
        success(result.queued ? "Configuración encolada: se sincronizará al reconectar" : "Configuración guardada")
      } else {
        error(result.error || "Error al guardar")
      }
    } catch {
      error("Error al guardar configuración")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configuración General</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configuración general del sistema Hermes POS.
        </p>
        <div className="space-y-2">
          <Label htmlFor="inviteExpiryHours">
            <Clock className="mr-1 inline size-3.5 text-muted-foreground" />
            Vencimiento de invitaciones (horas)
          </Label>
          <Input
            id="inviteExpiryHours"
            type="number"
            min="1"
            max="720"
            value={inviteExpiryHours}
            onChange={(e) => setInviteExpiryHours(parseInt(e.target.value) || 168)}
            className="w-48"
          />
          <p className="text-xs text-muted-foreground">
            Tiempo en horas hasta que expire el enlace de invitación (por defecto 168 = 7 días)
          </p>
        </div>
        <Button onClick={saveGeneralSettings} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Guardando...</> : "Guardar"}
        </Button>
      </CardContent>
    </Card>
  )
}