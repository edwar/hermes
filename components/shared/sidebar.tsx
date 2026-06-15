"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  BarChart3,
  Users,
  Tags,
  Store,
  ChevronRight,
  CircleUser,
  Wallet,
  Settings,
  Settings2,
  Building2,
  Mail,
  Truck,
  PackageSearch,
  Zap,
  X,
  Coins,
  History,
  Eye,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER", "ADMIN", "MANAGER", "CASHIER"] },
  { href: "/pos", label: "POS", icon: ShoppingCart, roles: ["OWNER", "ADMIN", "CASHIER"] },
  { href: "/sales", label: "Ventas", icon: Receipt, roles: ["OWNER", "ADMIN", "CASHIER"] },
  { href: "/electronic-invoices", label: "Fact. Electrónicas", icon: Zap, roles: ["OWNER", "ADMIN", "MANAGER", "CASHIER"] },
  { href: "/inventory", label: "Inventario", icon: Package, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/categories", label: "Categorías", icon: Tags, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/reports", label: "Reportes", icon: BarChart3, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/customers", label: "Clientes", icon: CircleUser, roles: ["OWNER", "ADMIN", "CASHIER"] },
  { href: "/suppliers", label: "Proveedores", icon: Truck, roles: ["OWNER", "ADMIN"] },
  { href: "/purchase-orders", label: "Compras", icon: PackageSearch, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/cajas", label: "Cajas", icon: Wallet, roles: ["OWNER", "ADMIN"] },
  { href: "/settings", label: "Configuración", icon: Settings, roles: ["OWNER", "ADMIN"] },
  { href: "/god-dashboard", label: "Panel GOD", icon: Eye, roles: ["GOD"] },
  { href: "/system-settings", label: "Config. Sistema", icon: Settings2, roles: ["GOD"] },
  { href: "/factus/transactions", label: "Transacciones Factus", icon: Coins, roles: ["GOD"] },
  { href: "/audit-log", label: "Auditoría", icon: History, roles: ["GOD"] },
  { href: "/notifications", label: "Notificaciones", icon: Bell, roles: ["GOD", "OWNER", "ADMIN"] },
  { href: "/users", label: "Usuarios", icon: Users, roles: ["OWNER", "ADMIN"] },
  { href: "/invites", label: "Invitaciones", icon: Mail, roles: ["GOD"] },
  { href: "/companies", label: "Empresas", icon: Building2, roles: ["GOD"] },
]

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true
    return role && item.roles.includes(role)
  })

  return (
    <>
      {/* Fondo oscuro: solo en móvil y solo cuando el drawer está abierto */}
      <div
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        aria-label="Navegación principal"
        className={cn(
          "flex w-64 flex-col border-r border-zinc-800 bg-sidebar transition-transform duration-200 ease-out",
          // Móvil: drawer fijo que se desliza desde la izquierda
          "fixed inset-y-0 left-0 z-50",
          open ? "translate-x-0" : "-translate-x-full",
          // Escritorio: siempre visible, sin posicionamiento fijo ni transformaciones
          "md:relative md:inset-auto md:translate-x-0 md:h-screen md:transition-none"
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-pos-brand shadow-sm shadow-pos-brand/30">
              <Store className="size-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-sans text-sm font-bold text-sidebar-foreground">Hermes POS</span>
              <span className="text-[11px] text-muted-foreground">Sistema de gestión</span>
            </div>
          </div>
          {/* Botón de cerrar: solo en móvil */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-zinc-800 hover:text-sidebar-foreground md:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Secciones">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-pos-brand text-white shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-pos-brand/10 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("size-4 shrink-0", isActive ? "text-white" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="size-3.5 text-white/70" />}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-zinc-800 p-4">
          <p className="text-xs text-muted-foreground/40 leading-relaxed">
            &copy; {new Date().getFullYear()} Hermes POS
          </p>
        </div>
      </aside>
    </>
  )
}
