---
name: Hermes
description: Consola de turno para tiendas colombianas: POS e inventario sobre grafito, paneles de línea fina y color solo para estado.
colors:
  ground: "#0D1117"
  panel: "#151A22"
  elevated: "#1B212B"
  seam: "#262C36"
  seam-strong: "#343B47"
  text: "#E6EDF3"
  muted: "#8B949E"
  faint: "#6E7681"
  action: "#1F6FEB"
  action-text: "#79C0FF"
  ok: "#56D364"
  ok-fill: "#238636"
  warn: "#E3B341"
  danger: "#F85149"
  data: "#C678DD"
  light-ground: "#F6F8FA"
  light-panel: "#FFFFFF"
  light-seam: "#D0D7DE"
  light-text: "#1F2328"
  light-muted: "#656D76"
  light-action: "#0969DA"
typography:
  micro:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.08em"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.08em"
  caption:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  ui:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  stat:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  total:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  hero:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Hermes

## Overview

**Escena física.** Son las 8 de la noche en una tienda de barrio: luz mixta y baja, un computador o tablet en el mostrador, una fila de clientes y un cajero que ya hizo cien ventas. La pantalla es un instrumento, no un folleto. Una superficie grafito reduce el deslumbramiento y deja que lo importante, el total, el cambio y el estado de la caja, sea lo más brillante de la pantalla.

**Mundo.** Una consola de trabajo oscura. Los paneles se separan con líneas de un píxel, no con sombras; el color significa estado y nada más; las cifras van en monoespaciada; los encabezados de panel son etiquetas pequeñas en mayúsculas; y toda acción destructiva está aislada por espacio vacío para que ningún dedo la alcance por accidente. Los paneles persisten y la navegación cambia su contenido sin reemplazar el layout.

**Modo.** Operate. Gana la legibilidad a un brazo de distancia y la velocidad de la venta, no la expresión. La marca vive en los detalles: la tipografía de cifras, el ritmo de las líneas y la forma en que el estado se dice con claridad.

**Estrategia de color.** Restrained: grafito más un solo color de acción. Verde, ámbar, rojo y violeta solo indican estado o dato, nunca decoran.

## Colors

- **Ground `#0D1117`**: fondo de la aplicación. **Panel `#151A22`** y **Elevated `#1B212B`**: dos escalones de elevación, nunca más.
- **Seam `#262C36` / Seam strong `#343B47`**: las líneas de un píxel que dividen todo. Sustituyen a la sombra.
- **Text `#E6EDF3`**, **Muted `#8B949E`**, **Faint `#6E7681`**: jerarquía de texto. Muted es el mínimo para texto secundario legible.
- **Action `#1F6FEB`**: el único color de acción. Un solo botón primario por vista (COBRAR en el POS). **Action text `#79C0FF`** para enlaces y selección.
- **Ok `#56D364`**: pagado, validado, caja cuadrada. **Warn `#E3B341`**: pendiente, stock bajo. **Danger `#F85149`**: rechazado, error, acciones destructivas. **Data `#C678DD`**: créditos de facturación y series secundarias de gráficas.
- Tema claro (alterno, para quien lo prefiera): ground `#F6F8FA`, panel `#FFFFFF`, seam `#D0D7DE`, text `#1F2328`, action `#0969DA`. Mismas reglas; solo cambian los valores.

**Reglas.** El color de estado nunca va solo: siempre acompaña un texto o un ícono. Ningún gradiente, ninguna sombra de color, ningún borde lateral grueso de acento.

## Typography

- **Geist** para texto y controles; **Geist Mono** para cifras, códigos de barras, números de factura, atajos de teclado y etiquetas de panel.
- Cifras monetarias siempre en mono y con números tabulares, alineadas a la derecha, con el formato COP `$ 285.600`.
- Escala fija: micro 10 (solo marcas como EJEMPLO), label 11, caption 12, ui 13, body 15, headline 18, stat 28, total 40, hero 56 (solo la landing).
- Etiqueta de panel: mono 11 px, mayúsculas, interletraje 0,08 em, color muted.
- Total del POS: mono 40 px semibold. Es el elemento más grande de la pantalla de venta.
- Texto corrido nunca menos de 12 px; 16 px en inputs táctiles.

## Layout

- Paneles que tilean la superficie y persisten. Barra lateral fija de 232 px (en tablet colapsa a íconos); contenido en paneles con separación de 1 px de seam.
- POS: catálogo a la izquierda, ticket en vivo a la derecha, y la franja de cobro (total + COBRAR) siempre fija abajo del ticket. Objetivos táctiles de al menos 44 px.
- Densidad por prioridad: en pantallas estrechas los paneles se apilan en orden de importancia declarado (ticket y cobro primero).
- Acciones destructivas apartadas del resto con espacio vacío, nunca adyacentes a una acción primaria.

## Elevation & Depth

Sin sombras. La profundidad es un escalón de color (ground, panel, elevated) más una línea de 1 px. Los modales usan un velo oscuro y el mismo panel elevated con su línea; nada flota con resplandor.

## Shapes

Esquinas casi rectas: 2 px en chips, 4 px en controles, 6 px en paneles y modales. `rounded-lg` pasa a significar 6 px. Nada de píldoras en contenedores.

## Components

- **Botón primario:** relleno action, texto blanco, 40 px de alto (48 px en COBRAR). **Secundario:** fondo elevated con línea seam. **Fantasma:** solo texto, para Cancelar.
- **Destructivo:** contorno discontinuo en danger, aislado; se rellena solo al recibir foco o confirmación.
- **Input:** panel con línea seam, foco con anillo action de 2 px; números en mono.
- **Panel (card):** línea de 1 px, sin sombra, encabezado en etiqueta mono.
- **Badge de estado:** punto de color + texto, sin relleno saturado.
- **Tabla:** líneas horizontales de 1 px, encabezado en etiqueta mono, acciones siempre visibles (nunca bajo hover).

## Do's and Don'ts

- **Sí:** decir el estado de la factura electrónica con texto y una acción posible. **No:** dejarlo solo en color.
- **Sí:** mantener cifras alineadas y en mono. **No:** mezclar tipografías en un mismo importe.
- **Sí:** un solo botón de acción por vista. **No:** dos botones azules compitiendo.
- **No:** gradientes, cristal, sombras de color, tarjetas dentro de tarjetas ni acentos de borde lateral.
- **No:** usar el rojo para decorar; es solo error, rechazo o destrucción.
