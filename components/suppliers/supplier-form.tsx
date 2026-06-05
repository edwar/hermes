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
import { useCreateSupplier, useUpdateSupplier } from "@/features/suppliers/hooks/use-suppliers"

interface Supplier {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
}

interface SupplierFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: Supplier | null
}

export function SupplierForm({ open, onOpenChange, supplier }: SupplierFormProps) {
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)

  const isEditing = !!supplier

  useEffect(() => {
    if (open) {
      if (supplier) {
        setName(supplier.name)
        setEmail(supplier.email ?? "")
        setPhone(supplier.phone ?? "")
        setAddress(supplier.address ?? "")
      } else {
        setName("")
        setEmail("")
        setPhone("")
        setAddress("")
      }
    }
  }, [open, supplier])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const data = {
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
    }

    try {
      if (supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, ...data })
      } else {
        await createSupplier.mutateAsync(data)
      }
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {supplier ? "Editar Proveedor" : "Agregar Proveedor"}
          </DialogTitle>
          <DialogDescription>
            {supplier
              ? "Modifica los datos del proveedor"
              : "Registra un nuevo proveedor"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del proveedor"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="proveedor@ejemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+57 300 000 0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Dirección del proveedor"
            />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name} className="w-full sm:w-auto">
              {loading ? "Guardando..." : supplier ? "Guardar cambios" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
