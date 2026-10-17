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
import { USER_ROLE } from "@/lib/constants"

interface NavItem {
  href: string
  section: "OPERACIÓN" | "CATÁLOGO" | "CONTROL" | "PLATAFORMA"
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const SECTION_ORDER = ["OPERACIÓN", "CATÁLOGO", "CONTROL", "PLATAFORMA"] as const

const navItems: NavItem[] = [
  { href: "/dashboard", section: "OPERACIÓN", label: "Dashboard", icon: LayoutDashboard, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER, USER_ROLE.CASHIER] },
  { href: "/pos", section: "OPERACIÓN", label: "POS", icon: ShoppingCart, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.CASHIER] },
  { href: "/sales", section: "OPERACIÓN", label: "Ventas", icon: Receipt, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.CASHIER] },
  { href: "/electronic-invoices", section: "OPERACIÓN", label: "Fact. Electrónicas", icon: Zap, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER, USER_ROLE.CASHIER] },
  { href: "/inventory", section: "CATÁLOGO", label: "Inventario", icon: Package, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER] },
  { href: "/categories", section: "CATÁLOGO", label: "Categorías", icon: Tags, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER] },
  { href: "/reports", section: "CONTROL", label: "Reportes", icon: BarChart3, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER] },
  { href: "/customers", section: "CATÁLOGO", label: "Clientes", icon: CircleUser, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.CASHIER] },
  { href: "/suppliers", section: "CATÁLOGO", label: "Proveedores", icon: Truck, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN] },
  { href: "/purchase-orders", section: "CATÁLOGO", label: "Compras", icon: PackageSearch, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER] },
  { href: "/cajas", section: "CONTROL", label: "Cajas", icon: Wallet, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN] },
  { href: "/settings", section: "CONTROL", label: "Configuración", icon: Settings, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN] },
  { href: "/god-dashboard", section: "PLATAFORMA", label: "Panel GOD", icon: Eye, roles: [USER_ROLE.GOD] },
  { href: "/system-settings", section: "PLATAFORMA", label: "Config. Sistema", icon: Settings2, roles: [USER_ROLE.GOD] },
  { href: "/factus/transactions", section: "PLATAFORMA", label: "Transacciones Factus", icon: Coins, roles: [USER_ROLE.GOD] },
  { href: "/audit-log", section: "PLATAFORMA", label: "Auditoría", icon: History, roles: [USER_ROLE.GOD] },
  { href: "/notifications", section: "CONTROL", label: "Notificaciones", icon: Bell, roles: [USER_ROLE.GOD, USER_ROLE.OWNER, USER_ROLE.ADMIN] },
  { href: "/users", section: "CONTROL", label: "Usuarios", icon: Users, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN] },
  { href: "/invites", section: "PLATAFORMA", label: "Invitaciones", icon: Mail, roles: [USER_ROLE.GOD] },
  { href: "/companies", section: "PLATAFORMA", label: "Empresas", icon: Building2, roles: [USER_ROLE.GOD] },
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
          "flex w-[232px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out",
          // Móvil: drawer fijo que se desliza desde la izquierda
          "fixed inset-y-0 left-0 z-50",
          open ? "translate-x-0" : "-translate-x-full",
          // Escritorio: siempre visible, sin posicionamiento fijo ni transformaciones
          "md:relative md:inset-auto md:translate-x-0 md:h-screen md:transition-none"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md border border-seam-strong bg-elevated">
              <Store className="size-4 text-info" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-[0.14em] text-foreground">HERMES</span>
          </div>
          {/* Botón de cerrar: solo en móvil */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-9 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-elevated hover:text-foreground md:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Secciones">
          {SECTION_ORDER.map((section) => {
            const items = visibleItems.filter((item) => item.section === section)
            if (items.length === 0) return null
            return (
              <div key={section} className="mb-4 last:mb-0">
                <p className="px-2 pb-1.5 font-mono text-[10px] font-medium tracking-[0.1em] text-faint">{section}</p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "group flex h-9 items-center gap-2.5 rounded-md border px-2 text-[13px] font-medium transition-colors",
                          isActive
                            ? "border-border bg-elevated text-foreground"
                            : "border-transparent text-sidebar-foreground hover:bg-elevated/60 hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", isActive ? "text-info" : "text-faint group-hover:text-sidebar-foreground")} />
                        <span className="flex-1 truncate">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="font-mono text-[10px] tracking-[0.08em] text-faint">
            HERMES POS &middot; {new Date().getFullYear()}
          </p>
        </div>
      </aside>
    </>
  )
}
