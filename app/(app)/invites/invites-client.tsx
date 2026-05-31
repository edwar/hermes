"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Copy, Plus, Trash2, Mail, CheckCircle, XCircle, Send } from "lucide-react"
import { formatDate } from "@/lib/utils"

async function fetchInvites() {
  const res = await fetch("/api/invites")
  if (!res.ok) throw new Error("Error al cargar invitaciones")
  return res.json()
}

async function createInvite(data: { companyName: string; email?: string }) {
  const res = await fetch("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al crear invitación")
  }
  return res.json()
}

async function deleteInvite(id: string) {
  const res = await fetch(`/api/invites?id=${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Error al eliminar invitación")
  return res.json()
}

export function InvitesClient() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [createdInvite, setCreatedInvite] = useState<{ token: string; inviteUrl: string } | null>(null)

  const { data: invites, isLoading } = useQuery({
    queryKey: ["invites"],
    queryFn: fetchInvites,
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const invite = await createInvite({ companyName, email: email || undefined })
      toast.success("Invitación creada")
      setCreatedInvite({ token: invite.token, inviteUrl: invite.inviteUrl })
      queryClient.invalidateQueries({ queryKey: ["invites"] })
      setCompanyName("")
      setEmail("")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function closeDialog() {
    setFormOpen(false)
    setCreatedInvite(null)
    setCompanyName("")
    setEmail("")
  }

  async function handleDelete(id: string) {
    try {
      await deleteInvite(id)
      toast.success("Invitación eliminada")
      queryClient.invalidateQueries({ queryKey: ["invites"] })
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function copyToken(token: string) {
    const url = `${window.location.origin}/register?token=${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    toast.success("Enlace copiado al portapapeles")
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Invitaciones</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nueva Invitación
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestión de Invitaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Creador</TableHead>
                  <TableHead className="w-20 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invites?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <Mail className="mx-auto size-8" />
                      <p className="mt-1">No hay invitaciones creadas</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  invites?.map((invite: any) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.companyName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {invite.email ? (
                          <a href={`mailto:${invite.email}`} className="hover:underline">{invite.email}</a>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {invite.token.slice(0, 12)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        {invite.used ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <CheckCircle className="mr-1 size-3" />
                            Usada
                          </Badge>
                        ) : new Date(invite.expiresAt) < new Date() ? (
                          <Badge variant="secondary">
                            <XCircle className="mr-1 size-3" />
                            Expirada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Activa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(invite.expiresAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invite.createdBy?.name || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToken(invite.token)}
                            title="Copiar enlace"
                          >
                            {copied === invite.token ? (
                              <CheckCircle className="size-4 text-green-500" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                          {!invite.used && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(invite.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdInvite ? "Invitación creada" : "Nueva Invitación"}
            </DialogTitle>
            <DialogDescription>
              {createdInvite
                ? "Comparte este enlace con la persona que quieres invitar"
                : "Crea una invitación para que una nueva empresa se registre"}
            </DialogDescription>
          </DialogHeader>

          {createdInvite ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-2">Enlace de invitación:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs break-all">{createdInvite.inviteUrl}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(createdInvite.inviteUrl)
                      toast.success("Enlace copiado")
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <Send className="mr-1 inline size-3" />
                Si configuraste RESEND_API_KEY, el correo fue enviado automáticamente.
                De lo contrario, copia el enlace y envíalo manualmente.
              </p>
              <DialogFooter>
                <Button onClick={closeDialog}>Cerrar</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre de la empresa *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nombre de la nueva empresa"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo del invitado</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="invitado@empresa.com (opcional)"
                />
                <p className="text-xs text-muted-foreground">
                  Si tienes RESEND_API_KEY configurado, el enlace se enviará automáticamente
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creando..." : "Crear invitación"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
