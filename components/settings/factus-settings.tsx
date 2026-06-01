"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle, Zap, AlertCircle, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

interface FactusSettings {
  enabled: boolean
  numberingRangeId: number | null
  economicActivity: string | null
  connected: boolean
  company: {
    name: string
    nit: string | null
    address: string | null
    email: string | null
    phone: string | null
  }
}

interface FactusSettingsResponse extends FactusSettings {
  success?: boolean
  error?: string
  message?: string
}

export function FactusSettings() {
  const [settings, setSettings] = useState<FactusSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [ranges, setRanges] = useState<any[]>([])
  const [loadingRanges, setLoadingRanges] = useState(false)
  const [showCreateRange, setShowCreateRange] = useState(false)
  const [creatingRange, setCreatingRange] = useState(false)
  const [newRange, setNewRange] = useState({ document: "01", prefix: "FD", current: "1" })
  const [form, setForm] = useState({
    enabled: false,
    numberingRangeId: "",
    economicActivity: "",
  })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch("/api/factus/settings")
      if (res.ok) {
        const data: FactusSettingsResponse = await res.json()
        setSettings(data)
        setForm({
          enabled: data.enabled,
          numberingRangeId: data.numberingRangeId?.toString() || "",
          economicActivity: data.economicActivity || "",
        })
      }
    } catch {
      setMessage({ type: "error", text: "Error al cargar configuración" })
    } finally {
      setLoading(false)
    }
  }

  async function fetchRanges() {
    setLoadingRanges(true)
    try {
      const res = await fetch("/api/factus/numbering-ranges")
      if (res.ok) {
        const data = await res.json()
        setRanges(data.data || [])
      }
    } catch {
      setMessage({ type: "error", text: "Error al cargar rangos" })
    } finally {
      setLoadingRanges(false)
    }
  }

  async function handleCreateRange() {
    setCreatingRange(true)
    setMessage(null)
    try {
      const res = await fetch("/api/factus/numbering-ranges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRange),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: "success", text: "Rango creado exitosamente" })
        setShowCreateRange(false)
        setNewRange({ document: "01", prefix: "FD", current: "1" })
        fetchRanges()
        fetchSettings()
      } else {
        setMessage({ type: "error", text: data.error || "Error al crear rango" })
      }
    } catch {
      setMessage({ type: "error", text: "Error al crear rango" })
    } finally {
      setCreatingRange(false)
    }
  }

  async function handleSaveSettings() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/factus/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: form.enabled,
          numberingRangeId: form.numberingRangeId,
          economicActivity: form.economicActivity,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: "success", text: "Configuración guardada" })
        fetchSettings()
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar" })
      }
    } catch {
      setMessage({ type: "error", text: "Error al guardar configuración" })
    } finally {
      setSaving(false)
    }
  }

  async function handleSelectRange(rangeId: string) {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/factus/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: form.enabled,
          numberingRangeId: rangeId,
          economicActivity: form.economicActivity,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: "success", text: "Rango asignado" })
        fetchSettings()
      } else {
        setMessage({ type: "error", text: data.error || "Error al asignar rango" })
      }
    } catch {
      setMessage({ type: "error", text: "Error al asignar rango" })
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/factus/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testConnection: true }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Conexión exitosa con Factus" })
        fetchSettings()
      } else {
        setMessage({ type: "error", text: data.error || "Error de conexión" })
      }
    } catch {
      setMessage({ type: "error", text: "Error al probar conexión" })
    } finally {
      setTesting(false)
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
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="size-4 text-primary" />
          Facturación Electrónica (Factus)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar facturación electrónica</Label>
              <p className="text-xs text-muted-foreground">
                Activa la emisión de facturas electrónicas a través de Factus.com.co
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>
        </div>

        {settings?.connected && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600">
            <CheckCircle2 className="size-4" />
            Conectado a Factus (token válido)
          </div>
        )}

        {!settings?.connected && settings?.enabled && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600">
            <AlertCircle className="size-4" />
            Token expirado o inválido. Prueba la conexión.
          </div>
        )}

        {settings?.connected && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rangos de numeración</Label>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateRange(!showCreateRange); if (!showCreateRange) fetchRanges(); }}>
                {showCreateRange ? <ChevronUp className="mr-1 size-4" /> : <Plus className="mr-1 size-4" />}
                {showCreateRange ? "Ocultar" : "Crear rango"}
              </Button>
            </div>

            {showCreateRange && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="rangeDoc">Documento</Label>
                    <Input id="rangeDoc" value={newRange.document} onChange={(e) => setNewRange(prev => ({ ...prev, document: e.target.value }))} placeholder="01" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rangePrefix">Prefijo</Label>
                    <Input id="rangePrefix" value={newRange.prefix} onChange={(e) => setNewRange(prev => ({ ...prev, prefix: e.target.value }))} placeholder="FD" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rangeCurrent">Desde</Label>
                    <Input id="rangeCurrent" value={newRange.current} onChange={(e) => setNewRange(prev => ({ ...prev, current: e.target.value }))} placeholder="1" />
                  </div>
                </div>
                <Button size="sm" onClick={handleCreateRange} disabled={creatingRange}>
                  {creatingRange ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Crear y asignar
                </Button>
              </div>
            )}

            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between p-3 border-b">
                <span className="text-xs font-medium">Rangos disponibles</span>
                <Button variant="ghost" size="sm" onClick={fetchRanges} disabled={loadingRanges}>
                  {loadingRanges ? <Loader2 className="size-4 animate-spin" /> : "Actualizar"}
                </Button>
              </div>
              {ranges.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground text-center">No hay rangos configurados</div>
              ) : (
                <div className="divide-y">
                  {ranges.map((range) => (
                    <div key={range.id} className="flex items-center justify-between p-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{range.prefix}</span>
                          <Badge variant="outline" className="text-xs">{range.document}</Badge>
                          {range.is_active === 1 && <Badge variant="default" className="text-xs bg-green-600">Activo</Badge>}
                          {range.is_expired === 1 && <Badge variant="destructive" className="text-xs">Vencido</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {range.from} - {range.to} · Actual: {range.current}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleSelectRange(range.id.toString())}>
                        Usar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="numberingRangeId">ID del rango de numeración</Label>
          <Input
            id="numberingRangeId"
            type="number"
            value={form.numberingRangeId}
            onChange={(e) => setForm((prev) => ({ ...prev, numberingRangeId: e.target.value }))}
            placeholder="Ej: 12345"
          />
          <p className="text-xs text-muted-foreground">
            Número de identificación del rango de numeración asignado por Factus
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="economicActivity">Actividad económica (CIIU)</Label>
          <Input
            id="economicActivity"
            value={form.economicActivity}
            onChange={(e) => setForm((prev) => ({ ...prev, economicActivity: e.target.value }))}
            placeholder="Ej: 4711"
          />
          <p className="text-xs text-muted-foreground">
            Código CIIU de la actividad económica principal
          </p>
        </div>

        <div className="rounded-lg border bg-muted/50 p-3">
          <h4 className="text-sm font-medium">Datos de la empresa</h4>
          <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
            <p><strong>Nombre:</strong> {settings?.company.name}</p>
            <p><strong>NIT:</strong> {settings?.company.nit || "No configurado"}</p>
            <p><strong>Dirección:</strong> {settings?.company.address || "No configurada"}</p>
            <p><strong>Email:</strong> {settings?.company.email || "No configurado"}</p>
          </div>
        </div>

        {message && (
          <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
            message.type === "success"
              ? "border border-green-500/20 bg-green-500/10 text-green-600"
              : "border border-red-500/20 bg-red-500/10 text-red-600"
          }`}>
            {message.type === "success" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {message.text}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 size-4 animate-spin" />Guardando...</> : "Guardar"}
          </Button>
          <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
            {testing ? <><Loader2 className="mr-2 size-4 animate-spin" />Probando...</> : "Probar conexión"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
