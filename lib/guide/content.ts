/**
 * Fuente única de la guía de uso. De aquí salen:
 *  - los subtítulos que se graban en cada video (tests/guide),
 *  - el texto de la página /guia (pasos y resumen),
 * así lo que se ve en el video y lo que se lee nunca se desfasan.
 */
export interface GuideVideo {
  slug: string
  title: string
  summary: string
  /** Un subtítulo por paso. El video los muestra en orden como «PASO n de N». */
  steps: string[]
}

export const GUIDE_VIDEOS: GuideVideo[] = [
  {
    slug: "abrir-caja",
    title: "Abrir la caja",
    summary: "Antes de vender hay que abrir una caja registradora con el efectivo con el que empiezas el turno.",
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
    steps: [
      "En Punto de venta pulsa Cerrar caja",
      "Revisa el resumen del turno: las ventas por método de pago",
      "Hermes calcula el efectivo que debería haber en la caja",
      "Cuenta el efectivo y escribe el monto contado",
      "Hermes muestra la diferencia: en verde, la caja cuadra",
      "Confirma el cierre: el turno queda registrado",
    ],
  },
]

export function getGuideVideo(slug: string) {
  return GUIDE_VIDEOS.find((v) => v.slug === slug)
}
