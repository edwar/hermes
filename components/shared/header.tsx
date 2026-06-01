"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { OnlineBadge } from "@/components/shared/online-badge"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { LogOut, User, AlertTriangle } from "lucide-react"
import { APP_NAME } from "@/lib/constants"

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/pos": "Punto de Venta",
  "/inventory": "Inventario",
  "/categories": "Categorías",
  "/reports": "Reportes",
  "/users": "Usuarios",
  "/sales": "Historial de Ventas",
  "/customers": "Clientes",
  "/stock-movements": "Movimientos de Stock",
  "/cajas": "Cajas",
  "/settings": "Configuración",
  "/profile": "Mi Perfil",
}

async function fetchActiveSession() {
  const res = await fetch("/api/cash-sessions/active")
  if (!res.ok) return null
  return res.json()
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [showLogoutWarning, setShowLogoutWarning] = useState(false)
  const initials = session?.user?.name?.charAt(0).toUpperCase() ?? "?"
  const title = pageTitles[pathname] ?? APP_NAME

  const { data: activeSession } = useQuery({
    queryKey: ["active-session-header"],
    queryFn: fetchActiveSession,
    enabled: false,
  })

  async function handleLogoutClick() {
    const session = await fetchActiveSession()
    if (session) {
      setShowLogoutWarning(true)
    } else {
      signOut({ callbackUrl: "/login" })
    }
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-pos-border bg-background/95 backdrop-blur-sm px-6 sticky top-0 z-10">
        <h1 className="font-sans text-xl font-bold tracking-tight">{title}</h1>
        <div className="flex items-center gap-4">
          <OnlineBadge />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted cursor-pointer transition-colors">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-sans font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start leading-tight max-w-36">
                <span className="text-sm font-medium truncate">{session?.user?.name}</span>
                <span className="text-[11px] text-muted-foreground capitalize">{session?.user?.role?.toLowerCase()}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-sans font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{session?.user?.name}</span>
                      <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/profile")}>
                <User className="mr-2 size-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={handleLogoutClick}
              >
                <LogOut className="mr-2 size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AlertDialog open={showLogoutWarning} onOpenChange={setShowLogoutWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Caja abierta
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tienes una sesión de caja abierta en{" "}
              <strong>{activeSession?.cashRegister?.name || "una caja"}</strong>.
              Debes cerrar la caja antes de cerrar sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/cajas")}>
              Ir a cerrar caja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
