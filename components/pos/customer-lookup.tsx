"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Search, Check, X, UserPlus, Pencil } from "lucide-react"

interface Customer {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  cedula?: string | null
}

interface CustomerLookupProps {
  onCustomerSelect: (customer: { id: string; name: string } | null) => void
  onRequestElectronicInvoiceChange: (value: boolean) => void
  requestElectronicInvoice: boolean
  onRequestCreateCustomer: (data: { cedula: string }) => void
  onRequestEditCustomer: (customer: Customer) => void
  selectedCustomer?: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    address?: string | null
    cedula?: string | null
  } | null
}

async function searchCustomerByCedula(cedula: string): Promise<Customer | null> {
  const res = await fetch(`/api/customers?search=${encodeURIComponent(cedula)}`)
  if (!res.ok) return null
  const data = await res.json()
  const found = data.customers?.find((c: Customer) => c.cedula === cedula)
  return found || null
}

export function CustomerLookup({
  onCustomerSelect,
  onRequestElectronicInvoiceChange,
  requestElectronicInvoice,
  onRequestCreateCustomer,
  onRequestEditCustomer,
  selectedCustomer,
}: CustomerLookupProps) {
  const [cedula, setCedula] = useState("")
  const [loading, setLoading] = useState(false)
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState("")
  const lastSearchedCedulaRef = useRef<string | null>(null)
  const lastTypedCedulaRef = useRef<string>("")

  useEffect(() => {
    if (selectedCustomer) {
      // Mostrar el cliente preseleccionado de inmediato para que el cajero
      // nunca vea un estado vacío transitorio.
      setFoundCustomer(selectedCustomer as Customer)
      setNotFound(false)
      // Si el cliente tiene cédula, sincronizar el input. Si no, conservar
      // lo que el cajero ya escribió (la búsqueda usa el valor tipeado como
      // fallback para correr y poder verificar el cliente).
      if (selectedCustomer.cedula) {
        setCedula(selectedCustomer.cedula)
        lastTypedCedulaRef.current = selectedCustomer.cedula
      }
      // Ejecutar la búsqueda para refrescar los datos del servidor. Usar
      // la cédula del cliente si existe; de lo contrario, la que tipeó el cajero.
      const cedulaToSearch = selectedCustomer.cedula ?? lastTypedCedulaRef.current
      if (cedulaToSearch && lastSearchedCedulaRef.current !== cedulaToSearch) {
        lastSearchedCedulaRef.current = cedulaToSearch
        void runSearch(cedulaToSearch)
      }
    } else {
      setFoundCustomer(null)
      setNotFound(false)
      lastSearchedCedulaRef.current = null
    }
  }, [selectedCustomer])

  useEffect(() => {
    if (!cedula) {
      setFoundCustomer(null)
      setNotFound(false)
      setError("")
    }
  }, [cedula])

  async function runSearch(cedulaToSearch: string) {
    const trimmed = cedulaToSearch.trim()
    if (!trimmed) return
    setLoading(true)
    setError("")

    try {
      const customer = await searchCustomerByCedula(trimmed)
      if (customer) {
        setFoundCustomer(customer)
        setCedula(customer.cedula ?? trimmed)
        lastTypedCedulaRef.current = customer.cedula ?? trimmed
        onCustomerSelect({ id: customer.id, name: customer.name })
        lastSearchedCedulaRef.current = customer.cedula ?? null
      }
      // Cuando hay cliente preseleccionado, confiamos en el prop: no se
      // pasa a "no encontrado" solo porque la búsqueda aún no devolvió
      // un resultado (carrera durante el refresco en segundo plano justo
      // después de crear). El flujo de handleSearch disparado por el
      // usuario pasa por la misma función pero con el prop en null, así
      // que el flujo explícito se maneja seteando notFound=true en el
      // call site de más abajo.
    } catch {
      setError("Error al buscar cliente")
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch() {
    // Búsqueda disparada por el usuario: limpiar el resultado anterior
    // primero para que el panel verde desaparezca mientras carga y vuelva
    // a aparecer solo si la nueva búsqueda encuentra algo.
    const trimmed = (cedula || lastTypedCedulaRef.current).trim()
    if (!trimmed) return
    setFoundCustomer(null)
    setNotFound(false)
    setLoading(true)
    setError("")
    try {
      const customer = await searchCustomerByCedula(trimmed)
      if (customer) {
        setFoundCustomer(customer)
        setCedula(customer.cedula ?? trimmed)
        lastTypedCedulaRef.current = customer.cedula ?? trimmed
        onCustomerSelect({ id: customer.id, name: customer.name })
        lastSearchedCedulaRef.current = customer.cedula ?? null
      } else {
        setNotFound(true)
      }
    } catch {
      setError("Error al buscar cliente")
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearch()
    }
  }

  function handleClear() {
    setCedula("")
    setFoundCustomer(null)
    setNotFound(false)
    setError("")
    onCustomerSelect(null)
    onRequestElectronicInvoiceChange(false)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="cedula">Buscar por cédula / NIT</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="cedula"
              value={cedula}
              onChange={(e) => {
                setCedula(e.target.value)
                lastTypedCedulaRef.current = e.target.value
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ingrese cédula o NIT"
              className="pl-9"
              disabled={!!foundCustomer}
            />
          </div>
          {!foundCustomer ? (
            <Button onClick={handleSearch} disabled={loading || !cedula.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="size-4" />
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {foundCustomer && (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="size-4" />
              <span className="text-sm font-medium">Cliente encontrado</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {foundCustomer.cedula || cedula || "Sin cédula"}
              </Badge>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => onRequestEditCustomer(foundCustomer)}>
                <Pencil className="size-3 text-green-700" />
              </Button>
            </div>
          </div>
          <div className="pl-6 space-y-1">
            <p className="text-sm font-medium">{foundCustomer.name}</p>
            {foundCustomer.email && (
              <p className="text-xs text-muted-foreground">{foundCustomer.email}</p>
            )}
            {foundCustomer.phone && (
              <p className="text-xs text-muted-foreground">{foundCustomer.phone}</p>
            )}
          </div>
        </div>
      )}

      {notFound && !foundCustomer && (
        <div className="rounded-lg border border-dashed p-3 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4" />
            <span className="text-sm font-medium">Cliente no encontrado</span>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            ¿Deseas registrarlo?
          </p>
          <div className="pl-6">
            <Button
              size="sm"
              onClick={() => onRequestCreateCustomer({ cedula: cedula.trim() })}
              className="w-full"
            >
              <UserPlus className="size-4 mr-1" />
              Registrar cliente
            </Button>
          </div>
        </div>
      )}

      {foundCustomer && (
        <div className="flex items-center space-x-2 rounded-lg border p-3">
          <Checkbox
            id="electronicInvoice"
            checked={requestElectronicInvoice}
            onCheckedChange={(checked) => onRequestElectronicInvoiceChange(checked === true)}
          />
          <div className="space-y-0.5 leading-none">
            <Label htmlFor="electronicInvoice" className="text-sm font-medium cursor-pointer">
              Factura electrónica DIAN
            </Label>
            <p className="text-xs text-muted-foreground">
              {foundCustomer.email ? "Se enviará por correo electrónico" : "Requiere datos del cliente"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
