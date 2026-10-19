/**
 * Fuente única de la guía de uso. De aquí salen:
 *  - los subtítulos que se graban en cada video (tests/guide),
 *  - el texto de la página /guia (pasos y resumen),
 *  - quién ve cada video (según el rol que puede abrir el módulo),
 * así lo que se ve en el video, lo que se lee y lo que cada usuario puede usar nunca se desfasan.
 */
import { ALL_ROLES, rolesFor, type Role } from "../navigation"
import { allowedModules } from "../permissions/resolve"

export type GuideSection = "PRIMEROS PASOS" | "OPERACIÓN" | "CATÁLOGO" | "CONTROL" | "PLATAFORMA"

export const GUIDE_SECTIONS: readonly GuideSection[] = ["PRIMEROS PASOS", "OPERACIÓN", "CATÁLOGO", "CONTROL", "PLATAFORMA"]

/** Nombres de rol tal como los muestra la aplicación (Usuarios y Perfil). */
export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  GOD: "Administrador de plataforma",
  OWNER: "Dueño",
  ADMIN: "Gerente",
  MANAGER: "Gestor",
  CASHIER: "Cajero",
}

export interface GuideVideo {
  slug: string
  title: string
  summary: string
  /** Un subtítulo por paso. El video los muestra en orden como «PASO n de N». */
  steps: string[]
  section: GuideSection
  /**
   * Módulo al que pertenece el video. Quién lo ve se deduce de los roles que pueden abrir ese módulo
   * (lib/navigation.ts). `null` = lo ven todos los roles, incluso sin iniciar sesión.
   */
  href: string | null
  /** Si es el video que abre la ayuda de la pantalla (cuando el módulo tiene más de uno). */
  contextual?: boolean
}

export const GUIDE_VIDEOS: GuideVideo[] = [
  {
    slug: "abrir-caja",
    title: "Abrir la caja",
    summary: "Antes de vender hay que abrir una caja registradora con el efectivo con el que empiezas el turno.",
    section: "OPERACIÓN",
    href: "/pos",
    steps: [
      "Entra a Punto de venta desde el menú",
      "Sin caja abierta, Hermes no deja vender: pulsa Abrir Caja",
      "Elige la caja registradora que vas a usar",
      "Escribe la base: el efectivo con el que empiezas el turno",
      "Confirma con Abrir Caja",
      "Listo: arriba aparece CAJA ABIERTA y ya puedes vender",
    ],
  },
  {
    slug: "pantalla-de-venta",
    title: "Conoce la pantalla de venta",
    summary: "El catálogo a la izquierda, el ticket a la derecha y el total siempre a la vista.",
    section: "OPERACIÓN",
    href: "/pos",
    contextual: true,
    steps: [
      "A la izquierda está el catálogo: cada producto muestra su precio y su stock",
      "Busca por nombre o con el lector de código de barras",
      "El punto ámbar avisa que quedan pocas unidades",
      "Toca un producto para agregarlo al ticket",
      "A la derecha se arma el ticket, con subtotal, IVA y total",
      "Cobra con el botón azul o con la tecla Espacio",
    ],
  },
  {
    slug: "vender-y-cobrar",
    title: "Vender y cobrar en efectivo",
    summary: "Arma el ticket, ajusta cantidades, recibe el pago y entrega el cambio sin equivocarte.",
    section: "OPERACIÓN",
    href: "/pos",
    steps: [
      "Toca los productos que lleva el cliente",
      "Cambia la cantidad con los botones más y menos",
      "Quita lo que el cliente ya no quiere con el icono de la papelera",
      "Pulsa Espacio para cobrar",
      "Escribe cuánto te entrega el cliente o toca un billete",
      "Hermes calcula el cambio: revísalo antes de confirmar",
      "Confirma la venta: el stock se descuenta solo",
      "Pulsa Nueva venta para atender al siguiente cliente",
    ],
  },
  {
    slug: "productos-por-peso",
    title: "Vender productos por peso",
    summary: "Para quesos, frutas o granos: escribe el peso o tómalo de la báscula y Hermes calcula el valor.",
    section: "OPERACIÓN",
    href: "/pos",
    steps: [
      "Toca un producto que se vende por peso",
      "En el ticket escribe el peso en kilogramos",
      "El valor se calcula según el peso",
      "Si cambia el peso, el total se actualiza al instante",
      "Cobra como cualquier otra venta",
    ],
  },
  {
    slug: "factura-electronica",
    title: "Facturar electrónicamente",
    summary: "Emite la factura electrónica ante la DIAN en la misma venta y revisa su estado.",
    section: "OPERACIÓN",
    href: "/pos",
    steps: [
      "Agrega los productos de la venta",
      "Pulsa Espacio para cobrar",
      "Busca al cliente por su cédula o NIT",
      "Marca Factura electrónica DIAN",
      "Confirma la venta",
      "Hermes la envía a la DIAN y descuenta un crédito",
      "En Facturas Electrónicas verás su estado: Validada",
    ],
  },
  {
    slug: "devolucion",
    title: "Hacer una devolución",
    summary: "Devuelve productos al inventario y, si la venta tenía factura, genera la nota crédito.",
    section: "OPERACIÓN",
    href: "/pos",
    steps: [
      "En Ventas, toca el ID de la venta para copiarlo",
      "Vuelve a Punto de venta y pulsa Devolución",
      "Pega el ID y busca la venta",
      "Elige cuántas unidades devuelve el cliente",
      "Si la venta tenía factura electrónica, deja marcada la nota crédito",
      "Escribe el motivo y pulsa Procesar devolución",
      "El stock se repone y la nota crédito queda en Facturas Electrónicas",
    ],
  },
  {
    slug: "cerrar-caja",
    title: "Cerrar la caja",
    summary: "Al terminar el turno, cuenta el efectivo y compáralo con lo que Hermes esperaba.",
    section: "OPERACIÓN",
    href: "/pos",
    steps: [
      "En Punto de venta pulsa Cerrar caja",
      "Revisa el resumen del turno: las ventas por método de pago",
      "Hermes calcula el efectivo que debería haber en la caja",
      "Cuenta el efectivo y escribe el monto contado",
      "Hermes muestra la diferencia: en verde, la caja cuadra",
      "Confirma el cierre: el turno queda registrado",
    ],
  },
  // ---------------------------------------------------------------------------------------------
  // PRIMEROS PASOS
  // ---------------------------------------------------------------------------------------------
  {
    slug: "registro-con-invitacion",
    title: "Crear tu cuenta con una invitación",
    summary: "Si Hermes te envió una invitación, así creas tu cuenta y la de tu negocio.",
    section: "PRIMEROS PASOS",
    href: null,
    steps: [
      "Abre el enlace de registro que recibiste",
      "El código de invitación ya viene completo en el enlace",
      "Escribe tu correo y tu nombre",
      "Elige una contraseña de al menos 6 caracteres",
      "Pulsa Crear cuenta",
      "Listo: ya puedes iniciar sesión con tu correo y tu contraseña",
    ],
  },
  {
    slug: "perfil-y-contrasena",
    title: "Tu perfil y tu contraseña",
    summary: "Cambia tu nombre y tu contraseña desde el menú de tu usuario.",
    section: "PRIMEROS PASOS",
    href: "/profile",
    steps: [
      "Abre el menú con tu nombre, arriba a la derecha",
      "Elige Perfil",
      "Aquí puedes cambiar tu nombre",
      "Para cambiar la contraseña escribe la actual y la nueva dos veces",
      "Pulsa Cambiar contraseña",
    ],
  },

  // ---------------------------------------------------------------------------------------------
  // OPERACIÓN
  // ---------------------------------------------------------------------------------------------
  {
    slug: "dashboard",
    title: "Entender el dashboard",
    summary: "Un vistazo al negocio: ventas de hoy y del mes, stock bajo y los productos que más se venden.",
    section: "OPERACIÓN",
    href: "/dashboard",
    contextual: true,
    steps: [
      "Entra a Dashboard desde el menú",
      "La franja de arriba resume tu negocio: ventas de hoy y del mes",
      "Stock bajo te dice cuántos productos hay que reponer",
      "La gráfica muestra las ventas de los últimos 30 días",
      "Más abajo ves cómo te pagan y qué productos se venden más",
    ],
  },
  {
    slug: "historial-de-ventas",
    title: "Consultar el historial de ventas",
    summary: "Encuentra cualquier venta por fecha o por forma de pago y revisa su detalle.",
    section: "OPERACIÓN",
    href: "/sales",
    contextual: true,
    steps: [
      "Entra a Ventas desde el menú",
      "Elige el rango de fechas que quieres revisar",
      "Filtra por forma de pago si lo necesitas",
      "Pulsa Buscar",
      "Abre una venta para ver su detalle",
      "Exportar CSV descarga el listado para abrirlo en Excel",
    ],
  },
  {
    slug: "revisar-facturas-electronicas",
    title: "Revisar tus facturas electrónicas",
    summary: "Mira el estado de cada factura y nota crédito, descárgalas y reintenta las que no se validaron.",
    section: "OPERACIÓN",
    href: "/electronic-invoices",
    contextual: true,
    steps: [
      "Entra a Fact. Electrónicas desde el menú",
      "Cada documento muestra su estado: validada, pendiente o rechazada",
      "Filtra por estado para encontrar lo que necesita atención",
      "En las validadas puedes descargar el PDF y el XML",
      "Las pendientes o rechazadas se reintentan con su botón (solo administradores)",
    ],
  },

  // ---------------------------------------------------------------------------------------------
  // CATÁLOGO
  // ---------------------------------------------------------------------------------------------
  {
    slug: "inventario",
    title: "Administrar el inventario",
    summary: "Busca, agrega, edita y elimina productos; Hermes calcula el precio de venta con tu ganancia.",
    section: "CATÁLOGO",
    href: "/inventory",
    contextual: true,
    steps: [
      "Entra a Inventario desde el menú",
      "Busca un producto por nombre o por código de barras",
      "Filtra por categoría o ve solo los de stock bajo",
      "Pulsa Agregar Producto",
      "Escribe el nombre, el precio de compra, tu ganancia y el stock",
      "Elige la categoría y guarda: el precio de venta se calcula solo",
      "Elimina con la papelera: Hermes siempre pide confirmación",
    ],
  },
  {
    slug: "movimientos-de-stock",
    title: "Registrar movimientos de stock",
    summary: "Ajusta el inventario cuando entra o sale mercancía fuera de una venta, y consulta el historial.",
    section: "CATÁLOGO",
    href: "/inventory",
    steps: [
      "En Inventario, abre la pestaña Movimientos",
      "Aquí queda el historial de cada entrada y salida de stock",
      "Pulsa Registrar Movimiento",
      "Elige el producto, el tipo de movimiento y la cantidad",
      "Escribe el motivo y guarda: el stock del producto se actualiza",
    ],
  },
  {
    slug: "categorias",
    title: "Organizar los productos en categorías",
    summary: "Las categorías ordenan el catálogo y facilitan los filtros del inventario.",
    section: "CATÁLOGO",
    href: "/categories",
    contextual: true,
    steps: [
      "Entra a Categorías desde el menú",
      "Cada categoría muestra cuántos productos tiene",
      "Pulsa Nueva Categoría",
      "Escribe el nombre y, si quieres, una descripción",
      "Guarda: ya puedes asignarla a tus productos",
    ],
  },
  {
    slug: "clientes",
    title: "Registrar y buscar clientes",
    summary: "Con la cédula o el NIT del cliente puedes facturarle electrónicamente desde el punto de venta.",
    section: "CATÁLOGO",
    href: "/customers",
    contextual: true,
    steps: [
      "Entra a Clientes desde el menú",
      "Busca por nombre, correo o teléfono",
      "Pulsa Nuevo Cliente",
      "Escribe el nombre, la cédula o NIT y el correo",
      "Guarda: ya puedes facturarle desde el punto de venta",
      "Edita o elimina con los iconos de su fila",
    ],
  },
  {
    slug: "proveedores",
    title: "Registrar proveedores",
    summary: "Guarda a quién le compras para hacerle pedidos más rápido.",
    section: "CATÁLOGO",
    href: "/suppliers",
    contextual: true,
    steps: [
      "Entra a Proveedores desde el menú",
      "Pulsa Nuevo Proveedor",
      "Escribe el nombre, el correo, el teléfono y la dirección",
      "Guarda: el proveedor queda listo para hacerle pedidos",
      "Búscalo cuando lo necesites por nombre, correo o teléfono",
    ],
  },
  {
    slug: "compras",
    title: "Hacer pedidos a proveedores",
    summary: "Registra lo que compras y, al recibir la mercancía, el stock sube automáticamente.",
    section: "CATÁLOGO",
    href: "/purchase-orders",
    contextual: true,
    steps: [
      "Entra a Compras desde el menú",
      "Pulsa Nuevo Pedido",
      "Elige el proveedor",
      "Agrega los productos con su cantidad y su precio de compra",
      "Revisa el total y pulsa Crear Pedido",
      "Cuando llegue la mercancía, pulsa Recibir e ingresa la cantidad recibida",
      "Confirma la recepción: el stock de los productos sube solo",
    ],
  },

  // ---------------------------------------------------------------------------------------------
  // CONTROL
  // ---------------------------------------------------------------------------------------------
  {
    slug: "reportes",
    title: "Ver los reportes de ventas",
    summary: "Consulta las ventas de cualquier periodo, con su cajero, método de pago y total.",
    section: "CONTROL",
    href: "/reports",
    contextual: true,
    steps: [
      "Entra a Reportes desde el menú",
      "Elige la fecha de inicio del periodo",
      "Elige la fecha final",
      "El listado muestra cada venta con su cajero, método y total",
      "Compara periodos cambiando las fechas",
    ],
  },
  {
    slug: "cajas",
    title: "Controlar las cajas",
    summary: "Mira la caja abierta, registra ingresos y retiros de efectivo y consulta el historial de turnos.",
    section: "CONTROL",
    href: "/cajas",
    contextual: true,
    steps: [
      "Entra a Cajas desde el menú",
      "Sesión activa muestra la caja abierta y lo que lleva vendido",
      "Registra un ingreso o un retiro de efectivo con Movimiento",
      "El historial muestra cada turno: apertura, cierre y diferencia",
      "Crea más cajas registradoras con Nueva caja",
    ],
  },
  {
    slug: "configuracion",
    title: "Configurar tu negocio",
    summary: "Los datos de tu empresa, la moneda, el IVA y el mensaje que sale en cada ticket.",
    section: "CONTROL",
    href: "/settings",
    contextual: true,
    steps: [
      "Entra a Configuración desde el menú",
      "Completa los datos de tu empresa",
      "Define el nombre del punto de venta, la moneda y el IVA",
      "Personaliza el mensaje que sale al pie del ticket",
      "Pulsa Guardar",
    ],
  },
  {
    slug: "configuracion-facturacion",
    title: "Conectar la facturación electrónica",
    summary: "Guarda las credenciales de tu cuenta de Factus, actívala y revisa tus rangos y créditos.",
    section: "CONTROL",
    href: "/settings",
    steps: [
      "En Configuración, baja hasta Facturación Electrónica",
      "Escribe el Client ID y el Client Secret de tu cuenta de Factus",
      "Escribe el correo y la contraseña del usuario de Factus",
      "Pulsa Guardar credenciales: se almacenan cifradas",
      "Después activa la facturación con el interruptor",
      "Más abajo ves tu saldo de créditos de facturación",
    ],
  },
  {
    slug: "usuarios",
    title: "Crear usuarios y asignar roles",
    summary: "Cada persona de tu equipo entra con su propio usuario y ve solo lo que su rol permite.",
    section: "CONTROL",
    href: "/users",
    contextual: true,
    steps: [
      "Entra a Usuarios desde el menú",
      "Pulsa Nuevo Usuario",
      "Escribe el nombre, el correo y una contraseña",
      "Elige el rol: define a qué pantallas tendrá acceso",
      "Guarda: la persona ya puede iniciar sesión",
      "Cambia su rol o su estado con el lápiz de su fila",
    ],
  },
  {
    slug: "notificaciones",
    title: "Atender las notificaciones",
    summary: "Avisos del sistema, como créditos de facturación por agotarse.",
    section: "CONTROL",
    href: "/notifications",
    contextual: true,
    steps: [
      "Entra a Notificaciones desde el menú",
      "Aquí llegan los avisos importantes, como créditos bajos",
      "El punto rojo de la campana indica cuántas no has leído",
      "Marca una como leída con su botón",
      "O márcalas todas con Marcar todas leídas",
    ],
  },
  // ---------------------------------------------------------------------------------------------
  // PLATAFORMA (solo administrador de plataforma)
  // ---------------------------------------------------------------------------------------------
  {
    slug: "panel-de-plataforma",
    title: "El panel de la plataforma",
    summary: "Un resumen de todas las empresas: cuántas hay, cuántas facturan electrónicamente y los créditos vendidos.",
    section: "PLATAFORMA",
    href: "/god-dashboard",
    contextual: true,
    steps: [
      "Entra a Panel GOD desde el menú",
      "La franja resume la plataforma: empresas, facturación y créditos",
      "Los créditos pendientes de activación aparecen aparte",
      "Abre una empresa con su botón para ver el detalle",
      "Abajo está la lista de todas las empresas con su estado y sus créditos",
    ],
  },
  {
    slug: "empresas",
    title: "Gestionar las empresas",
    summary: "Busca una empresa, revisa su actividad y activa los créditos de facturación que compró.",
    section: "PLATAFORMA",
    href: "/companies",
    contextual: true,
    steps: [
      "Entra a Empresas desde el menú",
      "Busca una empresa por su nombre",
      "La tabla muestra su NIT, si usa Factus, cuántos usuarios tiene y su estado",
      "El detalle está en el Panel GOD: pulsa Revisar en la empresa",
      "Ahí ves su actividad, sus ventas y sus créditos de facturación",
      "En la pestaña Factus, si compró créditos, actívalos con el botón Activar",
    ],
  },
  {
    slug: "invitaciones",
    title: "Invitar a una nueva empresa",
    summary: "Crea una invitación para que un negocio nuevo se registre; el enlace trae su código.",
    section: "PLATAFORMA",
    href: "/invites",
    contextual: true,
    steps: [
      "Entra a Invitaciones desde el menú",
      "Cada invitación muestra su estado y cuándo vence",
      "Pulsa Nueva Invitación",
      "Escribe el nombre de la empresa y, si quieres, el correo del invitado",
      "Pulsa Crear invitación",
      "Copia el enlace y envíaselo: con él la persona crea su cuenta",
    ],
  },
  {
    slug: "creditos-factus",
    title: "Seguir los créditos de facturación",
    summary: "El historial de créditos de todas las empresas: lo que compran y lo que consumen al facturar.",
    section: "PLATAFORMA",
    href: "/factus/transactions",
    contextual: true,
    steps: [
      "Entra a Transacciones Factus desde el menú",
      "Aquí queda el historial de créditos de todas las empresas",
      "Filtra por tipo: compras o consumos",
      "Las compras son créditos que una empresa adquirió",
      "Los consumos son un crédito por cada factura validada",
      "Exporta el historial con Exportar CSV",
    ],
  },
  {
    slug: "auditoria",
    title: "Consultar la auditoría",
    summary: "Cada acción importante queda registrada: quién la hizo, sobre qué y cuándo.",
    section: "PLATAFORMA",
    href: "/audit-log",
    contextual: true,
    steps: [
      "Entra a Auditoría desde el menú",
      "Cada acción importante queda registrada con quién, qué y cuándo",
      "Filtra por tipo de acción",
      "O escribe el ID de un usuario para ver solo sus acciones",
      "Pulsa Actualizar para aplicar los filtros",
    ],
  },
  {
    slug: "configuracion-del-sistema",
    title: "Configurar el sistema",
    summary: "Parámetros de toda la plataforma: vigencia de las invitaciones y alertas de créditos bajos.",
    section: "PLATAFORMA",
    href: "/system-settings",
    contextual: true,
    steps: [
      "Entra a Config. Sistema desde el menú",
      "Configuración General define cuánto duran las invitaciones",
      "Los umbrales deciden cuándo avisar que a una empresa le quedan pocos créditos",
      "Cada umbral tiene su prioridad: baja, media o alta",
      "Guarda para que aplique a todas las empresas",
    ],
  },
]

export function getGuideVideo(slug: string) {
  return GUIDE_VIDEOS.find((v) => v.slug === slug)
}

/** Roles que pueden ver el video. */
export function rolesOf(video: GuideVideo): readonly Role[] {
  return video.href === null ? ALL_ROLES : rolesFor(video.href)
}

/**
 * Videos de una persona, según los módulos que puede usar (ya resueltos con las reglas guardadas).
 * El administrador de plataforma (GOD) ve todos; sin sesión se ve la guía de negocio (todo menos Plataforma).
 */
export function guidesForModules(role: string | null | undefined, modules: readonly string[]): GuideVideo[] {
  if (role === "GOD") return [...GUIDE_VIDEOS]
  if (!role) return GUIDE_VIDEOS.filter((v) => v.section !== "PLATAFORMA")
  const allowed = new Set(modules)
  return GUIDE_VIDEOS.filter((v) => v.href === null || allowed.has(v.href))
}

/** Lo mismo con los accesos por defecto de cada rol (sin reglas guardadas). */
export function guidesFor(role: string | null | undefined): GuideVideo[] {
  return guidesForModules(role, role ? allowedModules({ userId: "", role, companyId: null }, []) : [])
}

/** Los videos de plataforma no se publican con un nombre de archivo predecible. */
export function isRestricted(video: GuideVideo): boolean {
  return video.section === "PLATAFORMA"
}

/** Video que abre la ayuda contextual de una ruta, si la hay. */
export function guideSlugForPath(pathname: string): string | null {
  const forPath = GUIDE_VIDEOS.filter((v) => v.href === pathname)
  return (forPath.find((v) => v.contextual) ?? forPath[0])?.slug ?? null
}

export function groupBySection(videos: GuideVideo[]) {
  return GUIDE_SECTIONS.map((section) => ({ section, videos: videos.filter((v) => v.section === section) })).filter(
    (g) => g.videos.length > 0
  )
}
