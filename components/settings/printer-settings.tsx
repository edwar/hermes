"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Printer, Usb, Server, Globe, Monitor, Loader2 } from "lucide-react"
import { sileo } from "sileo"
import {
  getPrintMethod,
  setPrintMethod,
  getWebUsbPrinter,
  setWebUsbPrinter,
  requestWebUsbPrinter,
  getQzTrayConfig,
  setQzTrayConfig,
  testPrint,
} from "@/lib/print/print-service"
import type { PrintMethod } from "@/lib/print/print-service"

interface PrinterSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const methods: { value: PrintMethod; label: string; icon: typeof Printer; desc: string }[] = [
  { value: "browser", label: "Navegador", icon: Monitor, desc: "Diálogo de impresión del navegador" },
  { value: "webusb", label: "WebUSB", icon: Usb, desc: "Conexión directa vía USB (ESC/POS)" },
  { value: "qztray", label: "QZ Tray", icon: Globe, desc: "Agente local QZ Tray en la PC" },
  { value: "server", label: "Servidor", icon: Server, desc: "Impresora conectada al servidor" },
]

export function PrinterSettings({ open, onOpenChange }: PrinterSettingsProps) {
  const [method, setMethod] = useState<PrintMethod>("browser")
  const [webusbPrinter, setWebusbPrinterState] = useState(getWebUsbPrinter())
  const [qzConfig, setQzConfig] = useState(getQzTrayConfig())
  const [testing, setTesting] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (open) {
      setMethod(getPrintMethod())
      setWebusbPrinterState(getWebUsbPrinter())
      setQzConfig(getQzTrayConfig())
    }
  }, [open])

  async function handleConnectWebUsb() {
    setConnecting(true)
    try {
      const info = await requestWebUsbPrinter()
      setWebUsbPrinter(info)
      setWebusbPrinterState(info)
      sileo.success({ title: "Impresora conectada" })
    } catch (err) {
      if (err instanceof Error && err.name !== "NotFoundError") {
        sileo.error({ title: "Error al conectar impresora" })
      }
    } finally {
      setConnecting(false)
    }
  }

  function handleDisconnectWebUsb() {
    setWebUsbPrinter(null)
    setWebusbPrinterState(null)
  }

  async function handleTest() {
    setTesting(true)
    try {
      await testPrint(method)
    } finally {
      setTesting(false)
    }
  }

  function handleSave() {
    setPrintMethod(method)
    if (method === "qztray") {
      setQzTrayConfig(qzConfig)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuración de impresión</DialogTitle>
          <DialogDescription>
            Elige cómo imprimir los tickets térmicos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <Label>Método de impresión</Label>
            <div className="grid gap-2">
              {methods.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                    method === value ? "border-primary bg-accent" : ""
                  }`}
                  onClick={() => setMethod(value)}
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {method === "webusb" && (
            <div className="space-y-3 rounded-lg border p-3">
              {webusbPrinter ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{webusbPrinter.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      VID: {webusbPrinter.vendorId.toString(16)} / PID: {webusbPrinter.productId.toString(16)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDisconnectWebUsb}>
                    Desconectar
                  </Button>
                </div>
              ) : (
                <Button onClick={handleConnectWebUsb} disabled={connecting} className="w-full">
                  {connecting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Usb className="mr-2 size-4" />
                  )}
                  Conectar impresora USB
                </Button>
              )}
            </div>
          )}

          {method === "qztray" && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="qz-host">Host</Label>
                  <Input
                    id="qz-host"
                    value={qzConfig.host}
                    onChange={(e) => setQzConfig({ ...qzConfig, host: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="qz-port">Puerto</Label>
                  <Input
                    id="qz-port"
                    type="number"
                    value={qzConfig.port}
                    onChange={(e) => setQzConfig({ ...qzConfig, port: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          {method === "server" && (
            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              <p>Requiere una impresora térmica conectada al servidor.</p>
              <p className="mt-1">Configura la variable de entorno <code className="text-xs bg-muted px-1 rounded">PRINTER_INTERFACE</code>.</p>
            </div>
          )}

          <Button variant="outline" onClick={handleTest} disabled={testing} className="w-full">
            {testing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Printer className="mr-2 size-4" />}
            Imprimir prueba
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
