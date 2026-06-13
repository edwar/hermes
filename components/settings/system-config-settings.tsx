"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Pencil, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"

interface SystemConfig {
  id: string
  category: string
  key: string
  value: string
  label: string
  description: string | null
  isActive: boolean
}

export function SystemConfigSettings() {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([])
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null)
  const [inviteExpiryHours, setInviteExpiryHours] = useState(168)

  async function fetchConfigs() {
    try {
      const res = await fetch("/api/settings/configs")
      if (res.ok) {
        const data = await res.json()
        setSystemConfigs(data.systemConfigs || [])
      }

      const settingsRes = await fetch("/api/settings")
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setInviteExpiryHours(settingsData.inviteExpiryHours ?? 168)
      }
    } catch {
      error("Error al cargar configuraciones")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  async function saveSystemConfig(config: SystemConfig) {
    setSaving(true)
    try {
      const result = await apiFetch<Record<string, unknown>>("/api/settings/configs", {
        method: "PUT",
        body: { type: "systemConfig", ...config },
        resource: "settings-configs",
        entityId: config.id,
      })
      if (result.ok) {
        success(result.queued ? "Configuración encolada: se sincronizará al reconectar" : "Configuración guardada")
        setEditingConfig(null)
        if (!result.queued) fetchConfigs()
      } else {
        error(result.error || "Error al guardar")
      }
    } catch {
      error("Error al guardar configuración")
    } finally {
      setSaving(false)
    }
  }

  async function deleteSystemConfig(id: string) {
    if (!confirm("¿Eliminar esta configuración?")) return
    try {
      const result = await apiFetch<Record<string, unknown>>(`/api/settings/configs?id=${id}&type=systemConfig`, {
        method: "DELETE",
        resource: "settings-configs",
        entityId: id,
        mockResponse: (_body, cid) => ({ id, clientId: cid, deleted: true }),
      })
      if (result.ok) {
        success(result.queued ? "Eliminación encolada" : "Configuración eliminada")
        if (!result.queued) fetchConfigs()
      }
    } catch {
      error("Error al eliminar")
    }
  }

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
        <CardTitle className="text-base">Configuración del Sistema</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="factus" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="factus">Parámetros Factus</TabsTrigger>
            <TabsTrigger value="general">Configuración General</TabsTrigger>
          </TabsList>

          <TabsContent value="factus" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Parámetros de integración con Factus. Estos valores se usan en los documentos electrónicos.
            </p>
            {systemConfigs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay configuraciones cargadas.</p>
            ) : (
              <div className="border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Parámetro</th>
                      <th className="text-left p-3 font-medium">Valor</th>
                      <th className="text-left p-3 font-medium">Descripción</th>
                      <th className="text-left p-3 font-medium">Activo</th>
                      <th className="text-right p-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemConfigs.map((config) => (
                      <tr key={config.id} className="border-b">
                        {editingConfig?.id === config.id ? (
                          <>
                            <td className="p-3 font-medium">{config.label}</td>
                            <td className="p-2">
                              <Input
                                value={editingConfig.value}
                                onChange={(e) => setEditingConfig({ ...editingConfig, value: e.target.value })}
                                className="h-8 w-24"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={editingConfig.description || ""}
                                onChange={(e) => setEditingConfig({ ...editingConfig, description: e.target.value })}
                                className="h-8"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={editingConfig.isActive}
                                onChange={(e) => setEditingConfig({ ...editingConfig, isActive: e.target.checked })}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => saveSystemConfig(editingConfig)} disabled={saving}>
                                  {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingConfig(null)}>
                                  <XCircle className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 font-medium">{config.label}</td>
                            <td className="p-3 font-mono text-xs">{config.value}</td>
                            <td className="p-3 text-xs text-muted-foreground">{config.description || "-"}</td>
                            <td className="p-3">{config.isActive ? "Sí" : "No"}</td>
                            <td className="p-3 text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => setEditingConfig(config)}>
                                  <Pencil className="size-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteSystemConfig(config.id)}>
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="general" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Configuración general del sistema Hermes POS.
            </p>
            <div className="space-y-4">
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
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}