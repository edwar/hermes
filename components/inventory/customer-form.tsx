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
import { useCreateCustomer, useUpdateCustomer } from "@/features/inventory/hooks/use-customers"
import { Loader2 } from "lucide-react"

interface CustomerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    cedula: string | null
  } | null
  defaultCedula?: string
  onCreated?: (customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    cedula: string | null
  }) => void
}

export function CustomerForm({ open, onOpenChange, customer, defaultCedula, onCreated }: CustomerFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [cedula, setCedula] = useState("")
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const isPending = createCustomer.isPending || updateCustomer.isPending
  const isEditing = !!customer

  useEffect(() => {
    if (open) {
      setName(customer?.name ?? "")
      setEmail(customer?.email ?? "")
      setPhone(customer?.phone ?? "")
      setAddress(customer?.address ?? "")
      setCedula(customer?.cedula ?? defaultCedula ?? "")
    }
  }, [open, customer, defaultCedula])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEditing) {
      await updateCustomer.mutateAsync({ id: customer!.id, name, email, phone, address, cedula })
    } else {
      const created = (await createCustomer.mutateAsync({ name, email, phone, address, cedula })) as { id: string; name: string; email: string | null; phone: string | null; address: string | null; cedula: string | null }
      onCreated?.(created)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Actualiza los datos del cliente" : "Registra un nuevo cliente"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cedula">Cédula / NIT</Label>
            <Input id="cedula" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Número de identificación" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del cliente" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@ejemplo.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+57 300 000 0000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección" />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button type="submit" disabled={isPending || !name} className="w-full sm:w-auto">
              {isPending ? (
                <><Loader2 className="mr-2 size-4 animate-spin" />{isEditing ? "Actualizando..." : "Guardando..."}</>
              ) : (
                isEditing ? "Actualizar" : "Guardar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
