/**
 * Qué rol puede abrir cada módulo. Es la ÚNICA fuente: la barra lateral lo usa para decidir qué enlaces
 * muestra y la guía de uso lo usa para decidir qué videos muestra a cada usuario.
 *
 * Este archivo no importa nada en tiempo de ejecución, para poder usarse desde la barra lateral, el
 * servidor y los scripts por igual.
 */
import type { USER_ROLE } from "@/lib/constants"

export type Role = (typeof USER_ROLE)[keyof typeof USER_ROLE]

const OWNER: Role = "OWNER"
const ADMIN: Role = "ADMIN"
const MANAGER: Role = "MANAGER"
const CASHIER: Role = "CASHIER"
const GOD: Role = "GOD"

export const ALL_ROLES: readonly Role[] = [GOD, OWNER, ADMIN, MANAGER, CASHIER]

export const NAV_ACCESS: Readonly<Record<string, readonly Role[]>> = {
  "/dashboard": [OWNER, ADMIN, MANAGER, CASHIER],
  "/pos": [OWNER, ADMIN, CASHIER],
  "/sales": [OWNER, ADMIN, CASHIER],
  "/electronic-invoices": [OWNER, ADMIN, MANAGER, CASHIER],
  "/inventory": [OWNER, ADMIN, MANAGER],
  "/categories": [OWNER, ADMIN, MANAGER],
  "/reports": [OWNER, ADMIN, MANAGER],
  "/customers": [OWNER, ADMIN, CASHIER],
  "/suppliers": [OWNER, ADMIN],
  "/purchase-orders": [OWNER, ADMIN, MANAGER],
  "/cajas": [OWNER, ADMIN],
  "/settings": [OWNER, ADMIN],
  "/god-dashboard": [GOD],
  "/system-settings": [GOD],
  "/factus/transactions": [GOD],
  "/audit-log": [GOD],
  "/notifications": [GOD, OWNER, ADMIN],
  "/users": [OWNER, ADMIN],
  "/invites": [GOD],
  "/companies": [GOD],
  // Rutas que no están en el menú pero pertenecen a un módulo
  "/stock-movements": [OWNER, ADMIN, MANAGER],
  // Emitir, reenviar y limpiar facturas electrónicas (el cajero solo las consulta)
  "/electronic-invoices/manage": [OWNER, ADMIN, MANAGER],
  "/profile": [GOD, OWNER, ADMIN, MANAGER, CASHIER],
}

export function rolesFor(href: string): readonly Role[] {
  return NAV_ACCESS[href] ?? []
}

export function canAccess(href: string, role: string | null | undefined): boolean {
  return !!role && (rolesFor(href) as readonly string[]).includes(role)
}
