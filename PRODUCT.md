# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dueños y cajeros de negocios pequeños en Colombia (tiendas, minimercados, papelerías, ferreterías, restaurantes). El usuario principal del día a día es el **cajero en el mostrador**: vende muchas veces al día desde un computador o tablet, con prisa, a veces con poca luz, atendiendo clientes en fila. El dueño o administrador entra a gestionar inventario, compras, proveedores, reportes y facturación electrónica. Roles existentes: GOD (superadmin de plataforma), OWNER, ADMIN, MANAGER y CASHIER.

## Product Purpose

Hermes es un sistema POS e inventario para negocios colombianos. Cubre venta con múltiples métodos de pago, control de stock, compras a proveedores, clientes, cajas con sesiones y denominaciones, devoluciones, reportes y facturación electrónica DIAN (vía Factus). Funciona sin conexión y sincroniza después (PWA).

Éxito: un cajero registra una venta en segundos sin errores, el inventario cuadra con la realidad, y el negocio factura electrónicamente sin conocer los detalles técnicos de la DIAN.

## Positioning

El núcleo del negocio (POS, inventario, clientes, cajas, reportes, usuarios) es **gratuito**. Solo se paga por factura electrónica, mediante créditos prepagados que Hermes revende con margen. A diferencia de los sistemas de facturación colombianos que cobran mensualidad, el comercio pequeño no paga nada hasta que necesita facturar electrónicamente. Además opera offline, algo que la conectividad irregular de muchos comercios exige.

## Operating Context

- Mostrador con computador o tablet, a veces lector de código de barras, báscula (venta por peso) e impresora térmica (QZ Tray o impresión del navegador).
- Turnos de caja con apertura, cierre y conteo por denominaciones en pesos colombianos (COP).
- Conectividad intermitente: las ventas se encolan y se sincronizan.
- Facturación electrónica con la DIAN a través de Factus: cada empresa usa su propia cuenta; los documentos pueden quedar pendientes, rechazados o validados.
- Idioma de la interfaz: español (Colombia), moneda COP.

## Capabilities and Constraints

- Stack: Next.js (App Router), React, Tailwind CSS 4, componentes shadcn/ui en `components/ui`, Prisma + Neon (PostgreSQL), better-auth.
- Reglas del repositorio (AGENTS.md) que todo trabajo de interfaz debe respetar: modal de confirmación en toda eliminación; acciones de tabla siempre visibles (sin hover); sin "cajas dentro de cajas"; formularios en modal con botón CTA arriba a la derecha; botón Cancelar en `ghost`; usar solo componentes de `components/ui`; cada ruta protegida con su `loading.tsx` que calque el layout real.
- Regla de radios: el repositorio fija `rounded-lg` como estándar. Su revisión en un rediseño es una decisión pendiente, no un hecho.
- Sin commits ni pushes sin autorización explícita; cambios por rama y PR.

## Brand Commitments

Se conserva el nombre **Hermes** y el tono cercano en español. Colores, tipografía y logo actuales no son vinculantes; pueden reemplazarse.

## Evidence on Hand

- Interfaz actual en `app/`, `components/`, `features/`; tokens en `app/globals.css`; tipografías Inter y JetBrains Mono (`app/layout.tsx`).
- Guiones y clips de redes en `scripts-redes.md` y `produccion-clips.md`.
- No hay testimonios, clientes de referencia ni métricas de uso publicables; no deben inventarse.

## Product Principles

1. La venta manda: lo que el cajero hace cien veces al día debe ser la superficie más rápida y clara de la app.
2. Cero sorpresas con el dinero: totales, cambio, estado de caja y consumo de créditos siempre visibles y sin ambigüedad.
3. El estado de la factura electrónica se dice con claridad (validada, en proceso, rechazada) y con una acción posible, nunca en silencio.
4. Funciona sin conexión y lo comunica: el cajero siempre sabe si lo vendido ya sincronizó.
5. Gratis y confiable primero; la facturación electrónica es una ayuda, no un obstáculo.

## Accessibility & Inclusion

Uso en mostrador con luz variable y pantallas de calidad modesta: contraste alto, objetivos táctiles grandes en el POS, soporte de teclado y lector de códigos de barras, interfaz íntegra en español.
