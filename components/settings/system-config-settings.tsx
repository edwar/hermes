"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Clock, AlertTriangle, Mail, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"
import { CONFIG_CATEGORY, CONFIG_KEY } from "@/lib/constants/config"

export function SystemConfigSettings() {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inviteExpiryHours, setInviteExpiryHours] = useState(168)
  const [thresholdLow, setThresholdLow] = useState(20)
  const [thresholdMedium, setThresholdMedium] = useState(10)
  const [thresholdHigh, setThresholdHigh] = useState(5)
  const [notificationEmails, setNotificationEmails] = useState("")

  async function fetchData() {
    setLoading(true)
    try {
      const [settingsRes, configsRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/settings/configs"),
      ])

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setInviteExpiryHours(data.inviteExpiryHours ?? 168)
      }

      if (configsRes.ok) {
        const data = await configsRes.json()
        const configs: any[] = data.systemConfigs ?? []
        const getVal = (key: string, def: number | string) => {
          const found = configs.find((c: any) => c.key === key && c.category === CONFIG_CATEGORY.NOTIFICATION)
          return found ? (typeof def === "number" ? parseInt(found.value) || Number(def) : found.value) : def
        }
        setThresholdLow(getVal(CONFIG_KEY.THRESHOLD_LOW, 20))
        setThresholdMedium(getVal(CONFIG_KEY.THRESHOLD_MEDIUM, 10))
        setThresholdHigh(getVal(CONFIG_KEY.THRESHOLD_HIGH, 5))
        setNotificationEmails(getVal(CONFIG_KEY.EMAILS, ""))
      }
    } catch {
      error("Error al cargar configuración")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  async function saveSystemConfig(key: string, value: string) {
    setSaving(true)
    try {
      const existing = await fetch("/api/settings/configs").then((r) => r.json())
      const configs: any[] = existing.systemConfigs ?? []
      const existingConfig = configs.find((c: any) => c.key === key && c.category === CONFIG_CATEGORY.NOTIFICATION)

      await apiFetch("/api/settings/configs", {
        method: "PUT",
        body: {
          type: "systemConfig",
          id: existingConfig?.id ?? null,
          category: CONFIG_CATEGORY.NOTIFICATION,
          key,
          value,
          label: key,
          description: "",
          isActive: true,
        } as any,
        resource: "settings-configs",
        entityId: existingConfig?.id ?? "new",
      })
      success("Configuración guardada")
    } catch {
      error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  async function saveAll() {
    setSaving(true)
    try {
      await Promise.all([
        apiFetch("/api/settings", {
          method: "PUT",
          body: { inviteExpiryHours },
          resource: "settings",
        }),
        saveSystemConfig(CONFIG_KEY.THRESHOLD_LOW, String(thresholdLow)),
        saveSystemConfig(CONFIG_KEY.THRESHOLD_MEDIUM, String(thresholdMedium)),
        saveSystemConfig(CONFIG_KEY.THRESHOLD_HIGH, String(thresholdHigh)),
        saveSystemConfig(CONFIG_KEY.EMAILS, notificationEmails),
      ])
      success("Todas las configuraciones guardadas")
    } catch {
      error("Error al guardar")
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración General</CardTitle>
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
              className="w-48"
            />
            <p className="text-xs text-muted-foreground">
              Tiempo en horas hasta que expire el enlace de invitación (por defecto 168 = 7 días)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-500" />
            Alertas de Créditos Factus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Umbrales de saldo para notificar a los administradores cuando una empresa está por agotar sus créditos.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="thresholdLow" className="text-xs">Prioridad Baja</Label>
              <Input
                id="thresholdLow"
                type="number"
                min="0"
                value={thresholdLow}
                onChange={(e) => setThresholdLow(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thresholdMedium" className="text-xs">Prioridad Media</Label>
              <Input
                id="thresholdMedium"
                type="number"
                min="0"
                value={thresholdMedium}
                onChange={(e) => setThresholdMedium(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thresholdHigh" className="text-xs">Prioridad Alta</Label>
              <Input
                id="thresholdHigh"
                type="number"
                min="0"
                value={thresholdHigh}
                onChange={(e) => setThresholdHigh(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4 text-primary" />
            Notificaciones por Correo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Lista de correos electrónicos que recibirán notificaciones cuando una empresa solicite activación de créditos.
            Separa múltiples correos con coma.
          </p>
          <div className="space-y-2">
            <Label htmlFor="notificationEmails">Correos electrónicos</Label>
            <Textarea
              id="notificationEmails"
              placeholder="admin@hermes.com, god@hermes.com"
              value={notificationEmails}
              onChange={(e) => setNotificationEmails(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveAll} disabled={saving} className="w-full sm:w-auto">
        {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 size-4" /> Guardar Todo</>}
      </Button>
    </div>
  )
}