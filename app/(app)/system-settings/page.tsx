"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, Mail, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SystemSettingsPage() {
  const { data: session } = useSession()
  const toast = useToast()
  const isGod = session?.user?.role === "GOD"
  const [inviteExpiryHours, setInviteExpiryHours] = useState(168)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings")
        if (res.ok) {
          const data = await res.json()
          setInviteExpiryHours(data.inviteExpiryHours ?? 168)
        }
      } catch (err) {
        console.error("Error loading settings:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteExpiryHours }),
      })
      if (res.ok) {
        toast.success("Configuración guardada")
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al guardar")
      }
    } catch (err) {
      toast.error("Error al guardar configuración")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isGod) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">No tienes acceso a esta página</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
          <p className="text-sm text-muted-foreground">Ajustes globales para el sistema Hermes POS</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 size-4" /> Guardar</>}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4 text-primary" /> Invitaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              placeholder="168"
              className="w-48"
            />
            <p className="text-xs text-muted-foreground">
              Tiempo en horas hasta que expire el enlace de invitación (por defecto 168 = 7 días)
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="text-xs text-muted-foreground">
        <p>Sesión activa: {session?.user?.name} ({session?.user?.role})</p>
      </div>
    </div>
  )
}
