// =============================================================================
// REGISTRO DE ACCESO DE LAS RUTAS DE LA API
// Cada app/api/**/route.ts debe estar aquí con su tipo de acceso. El test
// tests/unit/route-access.test.ts falla si una ruta no está registrada, si el registro no
// coincide con el código, o si una ruta marcada "module" no llama a guardModule.
//
//   module  → usa guardModule(módulo): respeta las reglas configurables (el destino de todas).
//   god     → solo el administrador de plataforma, con una comprobación escrita a mano.
//   session → cualquier persona con sesión, a propósito (sus propios datos o lo que el POS necesita).
//   public  → sin sesión.
//   legacy  → tiene una comprobación de rol escrita a mano (o ninguna); pendiente de pasar a
//             guardModule. `module` es el módulo al que debe quedar asociada; `gap` marca los
//             casos en que hoy NO se comprueba el rol y debería.
// =============================================================================

export type RouteAccess =
  | { kind: "module"; modules: string[] }
  | { kind: "god" }
  | { kind: "session"; note: string }
  | { kind: "public"; note: string }
  | { kind: "legacy"; module: string; gap?: string }

export const ROUTE_ACCESS: Record<string, RouteAccess> = {
  "audit-log": { kind: "god" },
  "auth/[...nextauth]": { kind: "public", note: "Inicio de sesión de next-auth" },
  "auth/register": { kind: "public", note: "Registro con código de invitación" },
  "cash-denominations": { kind: "legacy", module: "/cajas" },
  "cash-movements": { kind: "legacy", module: "/cajas" },
  "cash-registers": { kind: "legacy", module: "/cajas" },
  "cash-registers/[id]": { kind: "legacy", module: "/cajas" },
  "cash-sessions": { kind: "module", modules: ["/cajas", "/pos"] },
  "cash-sessions/[id]/close": { kind: "legacy", module: "/cajas" },
  "cash-sessions/[id]/report": { kind: "module", modules: ["/cajas"] },
  "cash-sessions/active": { kind: "session", note: "La caja abierta de la propia persona" },
  "cash-sessions/active/summary": { kind: "session", note: "Resumen de la propia caja abierta" },
  "cash-sessions/heartbeat": { kind: "session", note: "Solo la dueña de la sesión de caja" },
  categories: { kind: "module", modules: ["/categories"] },
  companies: { kind: "god" },
  customers: { kind: "module", modules: ["/customers"] },
  dashboard: { kind: "session", note: "Todos los roles de empresa ven el dashboard" },
  "exports/[report]": {
    kind: "legacy",
    module: "/reports",
    gap: "Solo exige sesión: cualquier rol puede exportar ventas, inventario, facturas y movimientos",
  },
  "factus/auth": { kind: "session", note: "El cajero puede reconectar; el token se refresca al facturar" },
  "factus/company-ranges": { kind: "legacy", module: "/settings" },
  "factus/credits": { kind: "legacy", module: "/settings" },
  "factus/credits/approve": { kind: "god" },
  "factus/credits/transactions": { kind: "legacy", module: "/settings" },
  "factus/diagnose-pending": { kind: "legacy", module: "/electronic-invoices" },
  "factus/invoices": { kind: "legacy", module: "/electronic-invoices" },
  "factus/invoices/[id]": { kind: "legacy", module: "/electronic-invoices" },
  "factus/numbering-ranges": { kind: "legacy", module: "/settings" },
  "factus/pending-bills": { kind: "legacy", module: "/electronic-invoices" },
  "factus/settings": { kind: "legacy", module: "/settings" },
  "factus/status": { kind: "session", note: "Estado de la conexión de la propia empresa" },
  "god/companies/[id]": { kind: "god" },
  "god/factus-config": { kind: "god" },
  "god/overview": { kind: "god" },
  invites: { kind: "god" },
  "invoicing/retry": { kind: "legacy", module: "/electronic-invoices" },
  notifications: { kind: "session", note: "Solo las notificaciones de la propia persona" },
  "notifications/[id]": { kind: "session", note: "Solo las notificaciones de la propia persona" },
  print: { kind: "session", note: "Impresión del ticket desde el POS" },
  products: { kind: "legacy", module: "/inventory" },
  "products/[id]": { kind: "legacy", module: "/inventory" },
  profile: { kind: "session", note: "El perfil de la propia persona" },
  "purchase-orders": { kind: "legacy", module: "/purchase-orders" },
  "purchase-orders/receive": { kind: "legacy", module: "/purchase-orders" },
  sales: { kind: "legacy", module: "/pos" },
  "sales/[id]": { kind: "module", modules: ["/pos"] },
  "sales/return": { kind: "module", modules: ["/pos"] },
  "sales/sync": { kind: "module", modules: ["/pos"] },
  settings: {
    kind: "legacy",
    module: "/settings",
    gap: "PUT solo exige sesión: cualquier rol puede cambiar el nombre, el IVA y el pie del ticket",
  },
  "settings/configs": {
    kind: "legacy",
    module: "/settings",
    gap: "PUT de medios de pago solo exige sesión; revisar qué roles deben poder cambiarlos",
  },
  "stock-movements": { kind: "module", modules: ["/stock-movements"] },
  suppliers: { kind: "legacy", module: "/suppliers" },
  "sync/batch": { kind: "session", note: "Repite cada operación con la sesión de quien la envía; cada ruta aplica su permiso" },
  users: { kind: "legacy", module: "/users" },
}
