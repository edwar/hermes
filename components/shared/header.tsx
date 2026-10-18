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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { OnlineBadge } from "@/components/shared/online-badge"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { NotificationBell } from "@/components/shared/notification-bell"
import { CloseSessionDialog } from "@/components/cajas/close-session-dialog"
import { LogOut, User, Menu, CircleHelp } from "lucide-react"
import Link from "next/link"
import { guideSlugForPath } from "@/lib/guide/content"
import { APP_NAME } from "@/lib/constants"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pos": "Punto de Venta",
  "/electronic-invoices": "Facturas Electrónicas",
  "/purchase-orders": "Compras",
  "/suppliers": "Proveedores",
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

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const initials = session?.user?.name?.charAt(0).toUpperCase() ?? "?"
  const title = pageTitles[pathname] ?? APP_NAME
  // Si hay un video para esta pantalla, se ofrece un acceso directo a su guía.
  const guideSlug = guideSlugForPath(pathname)

  const { data: activeSession } = useQuery({
    queryKey: ["active-session-header"],
    queryFn: fetchActiveSession,
    enabled: false,
  })

  async function handleLogoutClick() {
    const active = await fetchActiveSession()
    if (active) {
      setShowCloseDialog(true)
    } else {
      signOut({ callbackUrl: "/" })
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-3 sm:px-5">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:hidden touch-target"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-4">
          {guideSlug && (
            <Link
              href={`/guia#${guideSlug}`}
              className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Ver la guía de esta pantalla"
              title="Ver la guía de esta pantalla"
            >
              <CircleHelp className="size-4" />
              <span className="hidden md:inline">Guía</span>
            </Link>
          )}
          <OnlineBadge />
          <NotificationBell />
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-elevated cursor-pointer transition-colors touch-target">
              <Avatar className="size-7 rounded-md after:rounded-md">
                <AvatarFallback className="rounded-md bg-elevated font-mono text-xs font-semibold text-info">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start leading-tight max-w-36 min-w-0 w-full">
                <span className="block w-full text-sm font-medium truncate">{session?.user?.name}</span>
                <span className="block w-full text-left font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase truncate">{session?.user?.role?.toLowerCase()}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="rounded-md bg-elevated font-mono text-xs font-semibold text-info">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{session?.user?.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{session?.user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/profile")}>
                <User className="mr-2 size-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/guia")}>
                <CircleHelp className="mr-2 size-4" />
                Guía de uso
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

      <CloseSessionDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        onSessionClosed={() => signOut({ callbackUrl: "/" })}
      />
    </>
  )
}
