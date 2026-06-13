"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useOfflineCache } from "@/hooks/use-offline-cache"
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
  onCustomerSelect: (customer: { id: string; name: string; email?: string | null; phone?: string | null; address?: string | null; cedula?: string | null } | null) => void
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

export function CustomerLookup({
  onCustomerSelect,
  onRequestElectronicInvoiceChange,
  requestElectronicInvoice,
  onRequestCreateCustomer,
  onRequestEditCustomer,
  selectedCustomer,
}: CustomerLookupProps) {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId
  const { searchCachedCustomers, cacheCustomers } = useOfflineCache()
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

  async function searchCustomerByCedula(cedulaToSearch: string) {
    const trimmed = cedulaToSearch.trim()
    if (!trimmed) return null

    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(trimmed)}`)
      if (res.ok) {
        const data = await res.json()
        const found = data.customers?.find((c: Customer) => c.cedula === trimmed)
        if (found && companyId) {
          cacheCustomers([found], companyId)
        }
        return found || null
      }
    } catch {
      // fallback a cache local
    }

    if (companyId) {
      const cached = await searchCachedCustomers(trimmed, companyId)
      if (cached) return JSON.parse(cached.data) as Customer
    }
    return null
  }

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
        onCustomerSelect({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, address: customer.address, cedula: customer.cedula })
        lastSearchedCedulaRef.current = customer.cedula ?? null
      }
    } catch {
      setError("Error al buscar cliente")
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch() {
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
        onCustomerSelect({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, address: customer.address, cedula: customer.cedula })
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
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex gap-2">
          {!foundCustomer ? (
            <>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="cedula"
                  value={cedula}
                  onChange={(e) => {
                    setCedula(e.target.value)
                    lastTypedCedulaRef.current = e.target.value
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Cédula / NIT del cliente"
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <Button size="sm" onClick={handleSearch} disabled={loading || !cedula.trim()} className="h-9">
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Buscar"}
              </Button>
            </>
          ) : (
            <div className="flex-1 rounded-lg border bg-card px-3 py-2 min-h-[36px]">
              <div className="flex items-center gap-2">
                <Check className="size-3.5 shrink-0 text-green-600" />
                <span className="text-xs font-medium truncate min-w-0">{foundCustomer.name}</span>
                <Badge variant="outline" className="text-[10px] shrink-0 ml-auto">
                  {foundCustomer.cedula || cedula || "Sin cédula"}
                </Badge>
                <Button variant="ghost" size="icon-sm" className="size-6 shrink-0" onClick={() => onRequestEditCustomer(foundCustomer)}>
                  <Pencil className="size-3" />
                </Button>
                <Button variant="ghost" size="icon-sm" className="size-6 shrink-0 text-destructive" onClick={handleClear}>
                  <X className="size-3" />
                </Button>
              </div>
              {(foundCustomer.email || foundCustomer.phone) && (
                <div className="flex items-center gap-3 mt-0.5 ml-[22px]">
                  {foundCustomer.email && (
                    <span className="text-[10px] text-muted-foreground truncate">{foundCustomer.email}</span>
                  )}
                  {foundCustomer.phone && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{foundCustomer.phone}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {notFound && !foundCustomer && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2">
          <UserPlus className="size-3.5 shrink-0" />
          <span className="text-xs text-muted-foreground">Cliente no encontrado</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRequestCreateCustomer({ cedula: cedula.trim() })}
            className="ml-auto h-7 text-xs"
          >
            Registrar
          </Button>
        </div>
      )}

      {foundCustomer && (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <Checkbox
            id="electronicInvoice"
            checked={requestElectronicInvoice}
            onCheckedChange={(checked) => onRequestElectronicInvoiceChange(checked === true)}
            className="size-3.5"
          />
          <Label htmlFor="electronicInvoice" className="text-xs cursor-pointer font-medium leading-none">
            Factura electrónica DIAN
          </Label>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {foundCustomer.email ? "Se envía por correo" : "Sin email para FE"}
          </span>
        </div>
      )}
    </div>
  )
}
