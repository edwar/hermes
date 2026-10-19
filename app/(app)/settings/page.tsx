"use client"

import { useState, useEffect } from "react"
import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, Building2, MapPin, Phone, Hash, Mail, DollarSign, FileText, Image } from "lucide-react"
import type { StoreSettings } from "@/hooks/use-settings"
import { FactusSettings } from "@/components/settings/factus-settings"
import { DenominationSettings } from "@/components/settings/denomination-settings"
import { PermissionsMatrix } from "@/components/settings/permissions-matrix"
import { useCanSee } from "@/components/shared/allowed-modules"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { settings, isLoading, updateSettings, isSaving } = useSettings()
  const { success, error } = useToast()
  // Solo el dueño administra los permisos de su equipo.
  const canManagePermissions = useCanSee()("/permissions")
  const [form, setForm] = useState<Partial<StoreSettings & { companyName: string; nit: string; address: string; phone: string; email: string }>>({})

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        success("Configuración guardada")
      } else {
        const err = await res.json()
        error(err.error || "Error al guardar")
      }
    } catch {
      error("Error al guardar configuración")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm text-muted-foreground">Datos de la empresa que aparecen en los tickets</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || isLoading}>
          {isSaving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 size-4" /> Guardar</>}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary" /> Datos de la empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la empresa</Label>
                  <Input
                    id="companyName"
                    value={form.companyName ?? ""}
                    onChange={(e) => handleChange("companyName", e.target.value)}
                    placeholder="Mi Empresa SAS"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nit">
                    <Hash className="mr-1 inline size-3.5 text-muted-foreground" />
                    NIT
                  </Label>
                  <Input
                    id="nit"
                    value={form.nit ?? ""}
                    onChange={(e) => handleChange("nit", e.target.value)}
                    placeholder="123.456.789-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">
                    <MapPin className="mr-1 inline size-3.5 text-muted-foreground" />
                    Dirección
                  </Label>
                  <Input
                    id="address"
                    value={form.address ?? ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Dirección del negocio"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="mr-1 inline size-3.5 text-muted-foreground" />
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone ?? ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="300 123 4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="mr-1 inline size-3.5 text-muted-foreground" />
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="info@mitienda.com"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" /> Configuración del punto de venta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Nombre del punto de venta</Label>
                    <Input
                      id="storeName"
                      value={form.storeName ?? ""}
                      onChange={(e) => handleChange("storeName", e.target.value)}
                      placeholder="Punto de Venta Principal"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Input
                      id="currency"
                      value={form.currency ?? "COP"}
                      onChange={(e) => handleChange("currency", e.target.value)}
                      placeholder="COP"
                    />
                    <p className="text-xs text-muted-foreground">
                      Código ISO de la moneda (COP, USD, EUR, etc.)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxRate">IVA / Impuesto (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.taxRate !== undefined ? String(Number(form.taxRate) * 100) : "19"}
                      onChange={(e) => handleChange("taxRate", String(parseFloat(e.target.value) / 100 || 0))}
                      placeholder="19"
                    />
                    <p className="text-xs text-muted-foreground">
                      Porcentaje de impuesto que se aplica a las ventas
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="size-4 text-primary" /> Personalización del ticket
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="receiptFooter">Mensaje al pie del ticket</Label>
                    <Input
                      id="receiptFooter"
                      value={form.receiptFooter ?? ""}
                      onChange={(e) => handleChange("receiptFooter", e.target.value)}
                      placeholder="¡Gracias por su compra!"
                    />
                    <p className="text-xs text-muted-foreground">
                      Texto que aparece al final del ticket de venta
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">
                      <Image className="mr-1 inline size-3.5 text-muted-foreground" />
                      URL del logo
                    </Label>
                    <Input
                      id="logoUrl"
                      value={form.logoUrl ?? ""}
                      onChange={(e) => handleChange("logoUrl", e.target.value)}
                      placeholder="https://ejemplo.com/logo.png"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL pública del logo para mostrar en los tickets (opcional)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <FactusSettings />

          <DenominationSettings />

          {canManagePermissions && <PermissionsMatrix mode="owner" />}
        </>
      )}

      {!isLoading && (
        <div className="mt-4 text-xs text-muted-foreground">
          <Separator className="mb-4" />
          <p>Los datos guardados se usarán automáticamente en los tickets de venta, reportes de cierre e impresiones térmicas.</p>
        </div>
      )}
    </div>
  )
}
