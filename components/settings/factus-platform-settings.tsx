"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Zap } from "lucide-react"
import { sileo } from "sileo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SANDBOX_URL = "https://api-sandbox.factus.com.co"
const PRODUCTION_URL = "https://api.factus.com.co"

interface PlatformConfig {
  apiUrl: string
  urlSource: "database" | "environment" | "default"
  sandbox: boolean
  credentials: {
    configured: boolean
    source: "database" | "environment" | null
    clientId: string | null
    username: string | null
  }
}

const SOURCE_LABEL = { database: "guardada aquí", environment: "de las variables de entorno", default: "por defecto" } as const

/** Pantalla del GOD: a qué API de Factus apunta toda la plataforma y con qué cuenta de pruebas. */
export function FactusPlatformSettings() {
  const queryClient = useQueryClient()
  const { data: config = null, isLoading: loading } = useQuery({
    queryKey: ["factus-platform-config"],
    queryFn: async () => {
      const res = await fetch("/api/god/factus-config")
      if (!res.ok) throw new Error("No se pudo cargar la configuración de Factus")
      return (await res.json()) as PlatformConfig
    },
  })
  // null = sin editar: el campo muestra la URL guardada.
  const [urlDraft, setUrlDraft] = useState<string | null>(null)
  const apiUrl = urlDraft ?? config?.apiUrl ?? ""
  const [savingUrl, setSavingUrl] = useState(false)
  const [cred, setCred] = useState({ clientId: "", clientSecret: "", username: "", password: "" })
  const [savingCred, setSavingCred] = useState(false)
  const [testing, setTesting] = useState(false)

  async function save(payload: Record<string, unknown>, onDone: () => void) {
    const res = await fetch("/api/god/factus-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      sileo.error({ title: data.error ?? "No se pudo guardar" })
      return
    }
    queryClient.setQueryData(["factus-platform-config"], data)
    setUrlDraft(null)
    onDone()
    sileo.success({ title: "Configuración de Factus guardada" })
  }

  async function saveUrl() {
    setSavingUrl(true)
    try {
      await save({ apiUrl }, () => {})
    } finally {
      setSavingUrl(false)
    }
  }

  async function saveCredentials() {
    setSavingCred(true)
    try {
      await save({ credentials: cred }, () => setCred({ clientId: "", clientSecret: "", username: "", password: "" }))
    } finally {
      setSavingCred(false)
    }
  }

  async function testConnection() {
    setTesting(true)
    try {
      const res = await fetch("/api/god/factus-config", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) sileo.success({ title: data.message })
      else sileo.error({ title: data.error ?? "No se pudo conectar con Factus" })
    } catch {
      sileo.error({ title: "Error al probar la conexión" })
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

  const urlChanged = !!config && apiUrl.trim() !== config.apiUrl
  const credComplete = Object.values(cred).every((v) => v.trim())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          Factus de la plataforma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="factus-api-url">URL de la API</Label>
              <p className="text-xs text-muted-foreground">
                Aplica a todas las empresas. Solo se aceptan direcciones https de factus.com.co.
              </p>
            </div>
            {config && (
              <Badge variant={config.sandbox ? "warning" : "success"} className="text-xs">
                {config.sandbox ? "Sandbox" : "Producción"}
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="factus-api-url"
              value={apiUrl}
              onChange={(e) => setUrlDraft(e.target.value)}
              className="font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <Button variant="outline" size="sm" onClick={() => setUrlDraft(SANDBOX_URL)}>
              Sandbox
            </Button>
            <Button variant="outline" size="sm" onClick={() => setUrlDraft(PRODUCTION_URL)}>
              Producción
            </Button>
          </div>
          {config && (
            <p className="text-xs text-muted-foreground">URL actual {SOURCE_LABEL[config.urlSource]}.</p>
          )}
          {urlChanged && apiUrl.trim() !== SANDBOX_URL && (
            <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
              Al cambiar de API se descartan los tokens guardados de las empresas y cada una se reconecta en su
              próxima factura. Con una URL de producción, la cuenta de pruebas de abajo deja de usarse.
            </p>
          )}
          <Button size="sm" onClick={saveUrl} disabled={savingUrl || !urlChanged || !apiUrl.trim()}>
            {savingUrl ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            Guardar URL
          </Button>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label>Cuenta de pruebas (sandbox)</Label>
              <p className="text-xs text-muted-foreground">
                Respaldo para las empresas que aún no tienen credenciales propias, solo mientras la URL sea sandbox.
              </p>
            </div>
            {config?.credentials.configured ? (
              <Badge variant="success" className="text-xs">Configurada</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">Pendiente</Badge>
            )}
          </div>
          {config?.credentials.configured && (
            <p className="text-xs text-muted-foreground">
              Client ID: <span className="font-mono">{config.credentials.clientId}</span> · Usuario:{" "}
              <span className="font-mono">{config.credentials.username}</span>
              {config.credentials.source === "environment" ? " (de las variables de entorno)" : ""}. Los secretos
              no se muestran; para cambiarlos, ingresa los cuatro campos de nuevo.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="platform-client-id" className="text-xs">Client ID</Label>
              <Input id="platform-client-id" value={cred.clientId} autoComplete="off"
                onChange={(e) => setCred((p) => ({ ...p, clientId: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="platform-client-secret" className="text-xs">Client Secret</Label>
              <Input id="platform-client-secret" type="password" value={cred.clientSecret} autoComplete="off"
                onChange={(e) => setCred((p) => ({ ...p, clientSecret: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="platform-username" className="text-xs">Usuario (correo)</Label>
              <Input id="platform-username" type="email" value={cred.username} autoComplete="off"
                onChange={(e) => setCred((p) => ({ ...p, username: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="platform-password" className="text-xs">Contraseña</Label>
              <Input id="platform-password" type="password" value={cred.password} autoComplete="new-password"
                onChange={(e) => setCred((p) => ({ ...p, password: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={saveCredentials} disabled={savingCred || !credComplete}>
              {savingCred ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Guardar credenciales
            </Button>
            <Button size="sm" variant="outline" onClick={testConnection} disabled={testing || !config?.credentials.configured}>
              {testing ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Zap className="mr-1 size-4" />}
              Probar conexión
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
