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
  ArrowLeftRight,
  CircleUser,
  Wallet,
  Settings,
  Settings2,
  Building2,
  Mail,
  Truck,
  PackageSearch,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["GOD", "ADMIN", "MANAGER", "CASHIER"] },
  { href: "/pos", label: "POS", icon: ShoppingCart, roles: ["GOD", "ADMIN", "CASHIER"] },
  { href: "/sales", label: "Ventas", icon: Receipt, roles: ["GOD", "ADMIN", "CASHIER"] },
  { href: "/inventory", label: "Inventario", icon: Package, roles: ["GOD", "ADMIN", "MANAGER", "CASHIER"] },
  { href: "/categories", label: "Categorías", icon: Tags, roles: ["GOD", "ADMIN", "MANAGER"] },
  { href: "/reports", label: "Reportes", icon: BarChart3, roles: ["GOD", "ADMIN", "MANAGER"] },
  { href: "/customers", label: "Clientes", icon: CircleUser, roles: ["GOD", "ADMIN", "CASHIER"] },
  { href: "/suppliers", label: "Proveedores", icon: Truck, roles: ["GOD", "ADMIN"] },
  { href: "/purchase-orders", label: "Compras", icon: PackageSearch, roles: ["GOD", "ADMIN", "MANAGER"] },
  { href: "/cajas", label: "Cajas", icon: Wallet, roles: ["GOD", "ADMIN"] },
  { href: "/settings", label: "Configuración", icon: Settings, roles: ["GOD", "ADMIN"] },
  { href: "/system-settings", label: "Config. Sistema", icon: Settings2, roles: ["GOD"] },
  { href: "/users", label: "Usuarios", icon: Users, roles: ["GOD", "ADMIN"] },
  { href: "/invites", label: "Invitaciones", icon: Mail, roles: ["GOD"] },
  { href: "/companies", label: "Empresas", icon: Building2, roles: ["GOD"] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true
    return role && item.roles.includes(role)
  })

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-[oklch(0.28_0.01_40)] bg-sidebar">
      <div className="flex items-center gap-3 border-b border-[oklch(0.28_0.01_40)] px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/30">
          <Store className="size-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-sans text-sm font-bold text-sidebar-foreground">Hermes POS</span>
          <span className="text-[11px] text-muted-foreground">Sistema de gestión</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent/20 text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("size-4 shrink-0", isActive && "text-primary")} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="size-3.5 text-primary" />}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-[oklch(0.28_0.01_40)] p-4">
        <p className="text-xs text-muted-foreground/40 leading-relaxed">
          &copy; {new Date().getFullYear()} Hermes POS
        </p>
      </div>
    </aside>
  )
}
