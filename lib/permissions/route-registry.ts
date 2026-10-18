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
  | { kind: "module"; modules: string[]; note?: string }  // varios módulos: basta con uno (o cada método tiene el suyo)
  | { kind: "god" }
  | { kind: "session"; note: string }
  | { kind: "public"; note: string }
  | { kind: "legacy"; module: string; gap?: string }

export const ROUTE_ACCESS: Record<string, RouteAccess> = {
  "audit-log": { kind: "god" },
  "auth/[...nextauth]": { kind: "public", note: "Inicio de sesión de next-auth" },
  "auth/register": { kind: "public", note: "Registro con código de invitación" },
  "cash-denominations": { kind: "module", modules: ["/cajas"], note: "GET abierto: el POS lee las denominaciones" },
  "cash-movements": { kind: "module", modules: ["/pos"], note: "El cajero necesita la contraseña de un administrador" },
  "cash-registers": { kind: "module", modules: ["/cajas"], note: "GET abierto: el POS elige la caja al abrir sesión" },
  "cash-registers/[id]": { kind: "module", modules: ["/cajas"] },
  "cash-sessions": { kind: "module", modules: ["/cajas", "/pos"] },
  "cash-sessions/[id]/close": { kind: "session", note: "La persona dueña de la sesión de caja, o OWNER/ADMIN/GOD" },
  "cash-sessions/[id]/report": { kind: "module", modules: ["/cajas"] },
  "cash-sessions/active": { kind: "session", note: "La caja abierta de la propia persona" },
  "cash-sessions/active/summary": { kind: "session", note: "Resumen de la propia caja abierta" },
  "cash-sessions/heartbeat": { kind: "session", note: "Solo la dueña de la sesión de caja" },
  categories: { kind: "module", modules: ["/categories"] },
  companies: { kind: "god" },
  customers: { kind: "module", modules: ["/customers"] },
  dashboard: { kind: "session", note: "Todos los roles de empresa ven el dashboard" },
  "exports/[report]": {
    kind: "module",
    modules: ["/sales", "/reports", "/inventory", "/electronic-invoices", "/cajas", "/factus/transactions", "/stock-movements"],
    note: "Cada reporte exige el módulo donde se ve ese dato",
  },
  "factus/auth": { kind: "session", note: "El cajero puede reconectar; el token se refresca al facturar" },
  "factus/company-ranges": { kind: "module", modules: ["/settings"] },
  "factus/credits": { kind: "module", modules: ["/settings"], note: "GET abierto: el saldo de créditos de la propia empresa; comprar exige Configuración" },
  "factus/credits/approve": { kind: "god" },
  "factus/credits/transactions": { kind: "module", modules: ["/settings"] },
  "factus/diagnose-pending": { kind: "session", note: "Todos ven los datos básicos; el diagnóstico completo exige Configuración (canAccessModule)" },
  "factus/invoices": { kind: "module", modules: ["/electronic-invoices", "/electronic-invoices/manage"], note: "GET: consultar; POST: emitir (gestionar)" },
  "factus/invoices/[id]": { kind: "module", modules: ["/electronic-invoices", "/electronic-invoices/manage"], note: "GET: descargar PDF/XML; PATCH: reenviar, limpiar, enviar por correo (gestionar)" },
  "factus/numbering-ranges": { kind: "module", modules: ["/settings"] },
  "factus/pending-bills": { kind: "module", modules: ["/settings"] },
  "factus/settings": { kind: "module", modules: ["/settings"] },
  "factus/status": { kind: "session", note: "Estado de la conexión de la propia empresa" },
  "god/companies/[id]": { kind: "god" },
  "god/factus-config": { kind: "god" },
  "god/overview": { kind: "god" },
  invites: { kind: "god" },
  "invoicing/retry": { kind: "module", modules: ["/electronic-invoices/manage"], note: "El cron entra con CRON_SECRET, sin sesión" },
  notifications: { kind: "session", note: "Solo las notificaciones de la propia persona" },
  "notifications/[id]": { kind: "session", note: "Solo las notificaciones de la propia persona" },
  print: { kind: "session", note: "Impresión del ticket desde el POS" },
  products: { kind: "module", modules: ["/inventory"], note: "GET abierto: el POS lee el catálogo; eliminar no está permitido al Gestor" },
  "products/[id]": { kind: "module", modules: ["/inventory"], note: "GET abierto: el POS lee el producto; eliminar no está permitido al Gestor" },
  profile: { kind: "session", note: "El perfil de la propia persona" },
  "purchase-orders": { kind: "module", modules: ["/purchase-orders"] },
  "purchase-orders/receive": { kind: "module", modules: ["/purchase-orders"] },
  sales: { kind: "module", modules: ["/sales", "/reports", "/pos"], note: "GET: Ventas o Reportes; POST: POS" },
  "sales/[id]": { kind: "module", modules: ["/pos"] },
  "sales/return": { kind: "module", modules: ["/pos"] },
  "sales/sync": { kind: "module", modules: ["/pos"] },
  settings: { kind: "module", modules: ["/settings"], note: "GET abierto: todos los roles leen los datos de la tienda (tickets)" },
  "settings/configs": { kind: "module", modules: ["/settings"], note: "Medios de pago de la empresa; los ajustes del sistema son solo del GOD" },
  "stock-movements": { kind: "module", modules: ["/stock-movements"] },
  suppliers: { kind: "module", modules: ["/suppliers", "/purchase-orders"], note: "GET: también Compras (el pedido elige proveedor); crear, editar y borrar: Proveedores" },
  "sync/batch": { kind: "session", note: "Repite cada operación con la sesión de quien la envía; cada ruta aplica su permiso" },
  users: { kind: "module", modules: ["/users"], note: "Qué roles puede asignar y a quién puede editar: lib/permissions/user-management.ts" },
}
