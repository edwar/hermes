"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle, Zap, AlertCircle, Plus, RefreshCw } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { CreditBalanceCard } from "@/components/settings/credit-balance-card"
import { sileo } from "sileo"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface FactusSettings {
  enabled: boolean
  numberingRangeId: number | null
  economicActivity: string | null
  connected: boolean
  credentials: {
    configured: boolean
    clientId: string | null
    username: string | null
  }
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

const DOCUMENT_PREFIX_MAP: Record<string, string> = {
  "21": "FE", // Factura Electrónica de Venta
  "22": "NC", // Nota de Crédito
  "23": "ND", // Nota de Débito
  "24": "DS", // Documento Soporte
  "25": "NS", // Nota de Ajuste de Documento Soporte
  "26": "NE", // Nómina Electrónica
  "27": "NA", // Nota de Ajuste de Nómina
  "28": "EN", // Nota de Eliminación de Nómina
  "30": "FP", // Factura de Papel / Talonario
}

// Tipos de documento ofrecidos como botones de creación rápida en la UI.
// Por ahora solo se expone Notas crédito; el resto del mapa de prefijos
// queda disponible para rutas de código que necesiten etiquetar otros
// tipos de documento creados directamente vía la API.
const CREATE_RANGE_BUTTONS: Array<{ code: string; label: string }> = [
  { code: "22", label: "Nota crédito" },
]

export function FactusSettings() {
  const [settings, setSettings] = useState<FactusSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [ranges, setRanges] = useState<any[]>([])
  const [loadingRanges, setLoadingRanges] = useState(false)
  const [creatingRange, setCreatingRange] = useState(false)
  const [form, setForm] = useState({
    enabled: false,
    numberingRangeId: "",
    economicActivity: "",
  })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [rangeModal, setRangeModal] = useState<{ open: boolean; documentType: string; label: string } | null>(null)
  const [rangeForm, setRangeForm] = useState({ from: "", to: "" })
  const [rangesExpanded, setRangesExpanded] = useState(false)
  const [credForm, setCredForm] = useState({ clientId: "", clientSecret: "", username: "", password: "" })
  const [savingCreds, setSavingCreds] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (settings?.connected) {
      void fetchRanges()
    }
  }, [settings?.connected])

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
      const res = await fetch("/api/factus/company-ranges")
      if (res.ok) {
        const data = await res.json()
        setRanges(data.ranges || [])
      }
    } catch {
      setMessage({ type: "error", text: "Error al cargar rangos" })
    } finally {
      setLoadingRanges(false)
    }
  }

  function handleCreateRange(documentType: string, label: string) {
    setRangeModal({ open: true, documentType, label })
    setRangeForm({ from: "", to: "" })
  }

  function closeRangeModal() {
    setRangeModal(null)
  }

  async function submitRange() {
    if (!rangeModal) return
    const { documentType, label } = rangeModal
    const { from, to } = rangeForm
    const fromNum = parseInt(from)
    const toNum = parseInt(to)
    if (isNaN(fromNum) || isNaN(toNum) || fromNum > toNum) {
      sileo.error({ title: "Rango inválido" })
      return
    }

    setCreatingRange(true)
    try {
      const res = await fetch("/api/factus/numbering-ranges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: documentType,
          prefix: DOCUMENT_PREFIX_MAP[documentType] || "DS",
          from,
          to,
          current: from,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        sileo.success({ title: `${label} creado exitosamente` })
        setRangeModal(null)
        fetchRanges()
        fetchSettings()
      } else {
        sileo.error({ title: data.error || "Error al crear rango" })
      }
    } catch {
      sileo.error({ title: "Error al crear rango" })
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

  async function handleSaveCredentials() {
    setSavingCreds(true)
    setMessage(null)
    try {
      const res = await fetch("/api/factus/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: credForm }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        sileo.success({ title: "Credenciales guardadas. Activa la facturación para conectar." })
        setCredForm({ clientId: "", clientSecret: "", username: "", password: "" })
        fetchSettings()
      } else {
        sileo.error({ title: data.error || "Error al guardar credenciales" })
      }
    } catch {
      sileo.error({ title: "Error al guardar credenciales" })
    } finally {
      setSavingCreds(false)
    }
  }

  async function handleReconnect() {
    setReconnecting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/factus/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validateAndEnable: true }),
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        sileo.success({ title: "Conexión con Factus restablecida" })
        fetchSettings()
      } else {
        sileo.error({ title: data.errors?.join(", ") || data.error || "Error al reconectar" })
      }
    } catch {
      sileo.error({ title: "Error al reconectar con Factus" })
    } finally {
      setReconnecting(false)
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-primary" />
            Facturación Electrónica (Factus)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Credenciales de Factus</Label>
                <p className="text-xs text-muted-foreground">
                  Cada empresa factura con su propia cuenta de Factus (una por NIT).
                </p>
              </div>
              {settings?.credentials.configured ? (
                <Badge variant="default" className="bg-green-600 text-xs">Configuradas</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Pendientes</Badge>
              )}
            </div>
            {settings?.credentials.configured && (
              <p className="text-xs text-muted-foreground">
                Client ID: <span className="font-mono">{settings.credentials.clientId}</span> · Usuario:{" "}
                <span className="font-mono">{settings.credentials.username}</span>. Los secretos no se muestran;
                para cambiarlos, ingresa todos los campos de nuevo.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Client ID</Label>
                <Input
                  value={credForm.clientId}
                  onChange={(e) => setCredForm((p) => ({ ...p, clientId: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Client Secret</Label>
                <Input
                  type="password"
                  value={credForm.clientSecret}
                  onChange={(e) => setCredForm((p) => ({ ...p, clientSecret: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Correo del usuario</Label>
                <Input
                  type="email"
                  value={credForm.username}
                  onChange={(e) => setCredForm((p) => ({ ...p, username: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contraseña</Label>
                <Input
                  type="password"
                  value={credForm.password}
                  onChange={(e) => setCredForm((p) => ({ ...p, password: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleSaveCredentials}
              disabled={
                savingCreds ||
                !credForm.clientId ||
                !credForm.clientSecret ||
                !credForm.username ||
                !credForm.password
              }
            >
              {savingCreds ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Guardar credenciales
            </Button>
          </div>

          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Habilitar facturación electrónica</Label>
                <p className="text-xs text-muted-foreground">
                  Activa la emisión de facturas electrónicas a través de Factus.com.co
                </p>
              </div>
              <Switch
                checked={settings?.enabled || false}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    setTesting(true)
                    try {
                      const res = await fetch("/api/factus/settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ validateAndEnable: true }),
                      })
                      const data = await res.json()
                      if (res.ok && data.valid) {
                        sileo.success({ title: "Facturación electrónica activada" })
                        fetchSettings()
                      } else {
                        sileo.error({ title: data.errors?.join(", ") || data.error || "Error al activar" })
                      }
                    } catch {
                      sileo.error({ title: "Error al activar" })
                    } finally {
                      setTesting(false)
                    }
                  } else {
                    setTesting(true)
                    try {
                      const res = await fetch("/api/factus/settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ disconnect: true }),
                      })
                      const data = await res.json()
                      if (res.ok && data.success) {
                        sileo.success({ title: "Facturación electrónica desactivada" })
                        fetchSettings()
                      } else {
                        sileo.error({ title: data.error || "Error al desactivar" })
                      }
                    } catch {
                      sileo.error({ title: "Error al desactivar" })
                    } finally {
                      setTesting(false)
                    }
                  }
                }}
              />
            </div>
          </div>

          {settings?.enabled && settings.connected && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600">
              <CheckCircle2 className="size-4" />
              Facturación electrónica activa y conectada con Factus
            </div>
          )}

          {settings?.enabled && !settings.connected && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">Conexión con Factus perdida</p>
                  <p className="text-xs text-amber-600/80">
                    La facturación está habilitada pero el token expiró. Usa &quot;Reconectar&quot; para renovar la conexión sin perder la configuración.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReconnect}
                disabled={reconnecting}
                className="shrink-0 border-amber-500/30 bg-background hover:bg-amber-500/10"
              >
                {reconnecting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <RefreshCw className="mr-1.5 size-4" />}
                Reconectar
              </Button>
            </div>
          )}

          {!settings?.enabled && !settings?.connected && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600">
              <AlertCircle className="size-4" />
              Activa el toggle para conectar con Factus
            </div>
          )}

          {settings?.connected && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Rangos de numeración</Label>
                  <p className="text-xs text-muted-foreground">
                    {ranges.length === 0
                      ? "No hay rangos configurados. Crea al menos uno para poder facturar."
                      : `${ranges.length} ${ranges.length === 1 ? "rango configurado" : "rangos configurados"}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRangesExpanded((e) => !e)}
                >
                  {rangesExpanded ? "Ocultar" : "Gestionar"}
                </Button>
              </div>

              {rangesExpanded && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {CREATE_RANGE_BUTTONS.map(({ code, label }) => (
                      <Button
                        key={code}
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateRange(code, label)}
                        disabled={creatingRange}
                      >
                        {creatingRange ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Plus className="mr-1 size-4" />}
                        {label} ({code})
                      </Button>
                    ))}
                  </div>

                  <div className="rounded-lg border border-border">
                    <div className="flex items-center justify-between p-3 border-b">
                      <span className="text-xs font-medium">Rangos disponibles</span>
                      <Button variant="ghost" size="sm" onClick={fetchRanges} disabled={loadingRanges}>
                        {loadingRanges ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        <span className="ml-1.5">Actualizar</span>
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
                                <Badge variant="outline" className="text-xs">{range.documentType}</Badge>
                                {range.isActive && <Badge variant="default" className="text-xs bg-green-600">Activo</Badge>}
                                {range.isExpired && <Badge variant="destructive" className="text-xs">Vencido</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {range.from} - {range.to} · Actual: {range.current}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Datos de la empresa</h4>
              {!settings?.company.nit && (
                <Badge variant="destructive" className="text-xs">Incompletos</Badge>
              )}
            </div>
            <div className="mt-2 grid gap-2 text-xs">
              <p className={settings?.company.name ? "text-muted-foreground" : "text-red-500"}>
                <strong>Nombre:</strong> {settings?.company.name || "No configurado"}
              </p>
              <p className={settings?.company.nit ? "text-muted-foreground" : "text-red-500"}>
                <strong>NIT:</strong> {settings?.company.nit || "No configurado"}
              </p>
              <p className={settings?.company.address ? "text-muted-foreground" : "text-red-500"}>
                <strong>Dirección:</strong> {settings?.company.address || "No configurada"}
              </p>
              <p className={settings?.company.email ? "text-muted-foreground" : "text-red-500"}>
                <strong>Email:</strong> {settings?.company.email || "No configurado"}
              </p>
              <p className={settings?.company.phone ? "text-muted-foreground" : "text-red-500"}>
                <strong>Teléfono:</strong> {settings?.company.phone || "No configurado"}
              </p>
            </div>
          </div>

          <CreditBalanceCard />

          {message && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${message.type === "success"
              ? "border border-green-500/20 bg-green-500/10 text-green-600"
              : "border border-red-500/20 bg-red-500/10 text-red-600"
              }`}>
              {message.type === "success" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rangeModal} onOpenChange={() => setRangeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear rango - {rangeModal?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="number"
                value={rangeForm.from}
                onChange={(e) => setRangeForm((prev) => ({ ...prev, from: e.target.value }))}
                placeholder="Ej: 1001"
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="number"
                value={rangeForm.to}
                onChange={(e) => setRangeForm((prev) => ({ ...prev, to: e.target.value }))}
                placeholder="Ej: 2000"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setRangeModal(null)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={submitRange} disabled={creatingRange || !rangeForm.from || !rangeForm.to} className="w-full sm:w-auto">
              {creatingRange ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Creando...
                </span>
              ) : (
                "Crear"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
