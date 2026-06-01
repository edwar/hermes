"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User, Mail, Shield, Calendar, ShoppingCart, Save, Lock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

async function fetchProfile() {
  const res = await fetch("/api/profile")
  if (!res.ok) throw new Error("Error al cargar perfil")
  return res.json()
}

async function updateProfile(data: { name?: string; currentPassword?: string; newPassword?: string }) {
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "Error al actualizar perfil")
  }
  return res.json()
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [name, setName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  })

  useEffect(() => {
    if (profile?.name) setName(profile.name)
  }, [profile?.name])

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      toast.success("Perfil actualizado")
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      updateSession({ name: data.name })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleSaveInfo() {
    if (!name.trim()) return toast.error("El nombre no puede estar vacío")
    mutation.mutate({ name: name.trim() })
  }

  function handleChangePassword() {
    if (!currentPassword) return toast.error("Ingresa tu contraseña actual")
    if (newPassword.length < 6) return toast.error("La nueva contraseña debe tener al menos 6 caracteres")
    if (newPassword !== confirmPassword) return toast.error("Las contraseñas no coinciden")
    mutation.mutate({ currentPassword, newPassword })
  }

  const roleLabel = profile?.role === "GOD" ? "Super Admin" : profile?.role === "ADMIN" ? "Gerente" : profile?.role === "MANAGER" ? "Gestor" : "Cajero"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground">Información personal y configuración de la cuenta</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="size-4 text-primary" /> Información personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {profile?.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="font-medium">{profile?.name}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
<Badge variant={profile?.role === "GOD" ? "default" : profile?.role === "ADMIN" ? "default" : "secondary"} className="mt-1">
                          {profile?.role === "GOD" ? "Super Admin" : profile?.role === "ADMIN" ? "Gerente" : profile?.role === "MANAGER" ? "Gestor" : "Cajero"}
                        </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <Button onClick={handleSaveInfo} disabled={mutation.isPending || !name.trim()}>
                  {mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                  Guardar cambios
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="size-4 text-primary" /> Cambiar contraseña
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña actual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={mutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                >
                  {mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Lock className="mr-2 size-4" />}
                  Cambiar contraseña
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="size-4 text-primary" /> Detalles de la cuenta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Mail className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Correo electrónico</p>
                    <p className="font-medium">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Shield className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rol</p>
                    <p className="font-medium">{roleLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Calendar className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Miembro desde</p>
                    <p className="font-medium">
                      {profile?.createdAt ? format(new Date(profile.createdAt), "dd/MM/yyyy", { locale: es }) : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="size-4 text-primary" /> Actividad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold font-mono tabular-nums">{profile?._count?.sales ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Ventas totales</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold font-mono tabular-nums">{profile?.salesToday ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Ventas hoy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
