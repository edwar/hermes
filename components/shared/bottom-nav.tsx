"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  MoreHorizontal,
  BarChart3,
  Users,
  Tags,
  Settings,
  Wallet,
  Truck,
  PackageSearch,
  Zap,
  Building2,
  Mail,
  Settings2,
  CircleUser,
  Coins,
  History,
  Eye,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { USER_ROLE } from "@/lib/constants"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const allItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER, USER_ROLE.CASHIER] },
  { href: "/pos", label: "POS", icon: ShoppingCart, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.CASHIER] },
  { href: "/sales", label: "Ventas", icon: Receipt, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.CASHIER] },
  { href: "/inventory", label: "Inventario", icon: Package, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER] },
  { href: "/categories", label: "Categorías", icon: Tags, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER] },
  { href: "/reports", label: "Reportes", icon: BarChart3, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER] },
  { href: "/customers", label: "Clientes", icon: CircleUser, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.CASHIER] },
  { href: "/suppliers", label: "Proveedores", icon: Truck, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN] },
  { href: "/purchase-orders", label: "Compras", icon: PackageSearch, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER] },
  { href: "/cajas", label: "Cajas", icon: Wallet, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN] },
  { href: "/settings", label: "Configuración", icon: Settings, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN] },
  { href: "/god-dashboard", label: "Panel GOD", icon: Eye, roles: [USER_ROLE.GOD] },
  { href: "/system-settings", label: "Config. Sistema", icon: Settings2, roles: [USER_ROLE.GOD] },
  { href: "/factus/transactions", label: "Transacciones Factus", icon: Coins, roles: [USER_ROLE.GOD] },
  { href: "/audit-log", label: "Auditoría", icon: History, roles: [USER_ROLE.GOD] },
  { href: "/notifications", label: "Notificaciones", icon: Bell, roles: [USER_ROLE.GOD, USER_ROLE.OWNER, USER_ROLE.ADMIN] },
  { href: "/users", label: "Usuarios", icon: Users, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN] },
  { href: "/invites", label: "Invitaciones", icon: Mail, roles: [USER_ROLE.GOD] },
  { href: "/companies", label: "Empresas", icon: Building2, roles: [USER_ROLE.GOD] },
  { href: "/electronic-invoices", label: "Fact. Electrónicas", icon: Zap, roles: [USER_ROLE.OWNER, USER_ROLE.ADMIN, USER_ROLE.MANAGER, USER_ROLE.CASHIER] },
]

interface BottomNavProps {
  onMoreClick: () => void
}

const primaryHrefs = ["/pos", "/sales", "/inventory"]

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role

  const visibleItems = allItems.filter((item) => {
    if (!item.roles) return true
    return role && item.roles.includes(role)
  })

  const primaryItems = primaryHrefs
    .map((href) => visibleItems.find((item) => item.href === href))
    .filter((item): item is NavItem => !!item)

  const hasMore = visibleItems.length > primaryItems.length

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur-sm safe-bottom md:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {primaryItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors touch-target",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("size-5", isActive && "text-primary")} />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          )
        })}
        {hasMore && (
          <li className="flex-1">
            <button
              type="button"
              onClick={onMoreClick}
              className="flex w-full flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground touch-target"
              aria-label="Ver más opciones"
            >
              <MoreHorizontal className="size-5" />
              <span className="leading-none">Más</span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
