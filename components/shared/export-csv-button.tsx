"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"

export function ExportCSVButton({ report, label, params }: { report: string; label?: string; params?: Record<string, string> }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const qs = new URLSearchParams(params)
      const res = await fetch(`/api/exports/${report}?${qs.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al exportar" }))
        alert(err.error || "Error al exportar")
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${report}-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      alert("Error al exportar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
      {label || "Exportar CSV"}
    </Button>
  )
}
