"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"
import { SystemConfigSettings } from "@/components/settings/system-config-settings"
import { FactusPlatformSettings } from "@/components/settings/factus-platform-settings"

export default function SystemSettingsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) setLoading(false)
  }, [session])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (session?.user?.role !== "GOD") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">No tienes acceso a esta página</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
        <p className="text-sm text-muted-foreground">Ajustes globales para el sistema Hermes</p>
      </div>

      <FactusPlatformSettings />

      <SystemConfigSettings />

      <div className="text-xs text-muted-foreground">
        <p>Sesión activa: {session?.user?.name} ({session?.user?.role})</p>
      </div>
    </div>
  )
}
