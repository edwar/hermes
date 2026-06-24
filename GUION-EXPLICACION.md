# Guion de Explicación — Venta y Devolución en Hermes

## Introducción (30 seg)

"Hermes es un sistema POS que maneja dos backends:

1. **Nuestro backend** —Node.js + Prisma + Neon (PostgreSQL)— donde guardamos ventas, productos, inventario, clientes.
2. **Factus** —un Proveedor Tecnológico autorizado por la DIAN— que se encarga de la facturación electrónica colombiana.

Hoy voy a explicar cómo fluye la información a través de ambos sistemas cuando hacemos una **venta** y cuando hacemos una **devolución**."

---

## 1. FLUJO DE VENTA (5 min)

### 1.1 El usuario en el POS

"Todo empieza en el POS. El usuario:

1. Busca un cliente en el `CustomerLookup` (por cédula o NIT).
2. Si el cliente está registrado, puede marcar el checkbox **'Solicitar Factura Electrónica DIAN'**.
3. Agrega productos al carrito.
4. Selecciona método de pago (Efectivo, Tarjeta, Crédito, Transferencia) y confirma."

### 1.2 Llega al endpoint POST /api/sales

"El frontend llama a `POST /api/sales`. Acá empieza la coreografía entre los dos backends. Abramos `app/api/sales/route.ts`."

#### Paso 1 — Crear la venta en nuestra DB (línea ~75)

"**Primero**, guardamos la venta en **nuestra base de datos** (Prisma/Neon). Creamos el registro `Sale` con sus `SaleItem` asociados. Esto incluye subtotal, impuestos, descuento, total, método de pago, etc."

#### Paso 2 — Descontar inventario (línea ~153)

"**Segundo**, descontamos el stock. Por cada producto:

- Restamos la cantidad vendida del campo `stock` en la tabla `Product`.
- Creamos un `StockMovement` con tipo `OUT` para tener trazabilidad.

¿Porqué hacemos esto? Para que el inventario esté siempre sincronizado, incluso si la factura electrónica falla. La venta ya existe en nuestro sistema."

#### Paso 3 — Factura Electrónica (línea ~187)

"**Tercero**, si el usuario solicitó Factura Electrónica **y** la empresa tiene Factus habilitado con créditos disponibles, entramos en la integración con Factus."

##### 3a — Verificaciones (línea ~189)

"Primero verificamos:

- `factusEnabled`: la empresa configuró Factus.
- `factusBlocked`: no está bloqueada por saldo impago.
- `factusCreditBalance > 0`: tiene créditos de facturación disponibles.

Si alguna falla, la venta se crea **sin** FE y se muestra una advertencia en consola."

##### 3b — Obtener rango de numeración (línea ~206)

"Factus requiere que cada factura use un **rango de numeración** asignado por DIAN. Obtenemos el activo para el tipo de documento '21' (Factura Electrónica de Venta)."

##### 3c — Mapear al payload de Factus (línea ~209)

"Acá usamos `mapSaleToFactusInvoice()` en `lib/factus/mappers.ts`. Esta función **traduce** nuestra venta (con su estructura de Prisma) al formato JSON que Factus/DIAN espera:

- `document: '01'` = Factura Electrónica de Venta.
- `customer`: mapea los datos del cliente (o usa 'Consumidor Final' genérico).
- `items`: cada producto con su código, nombre, cantidad, precio, impuesto IVA 19%.
- `payment_details`: método y forma de pago.

Es el **puente** entre nuestro modelo de datos y el estándar DIAN."

##### 3d — Limpiar pendientes (línea ~216)

"Un detalle importante: Factus solo permite tener **una factura pendiente a la vez** por rango de numeración. Por eso, antes de crear la nueva, listamos las facturas pendientes (`status=0`) y las destruimos por código de referencia.

Si alguna ya fue enviada a DIAN, forzamos una **Aceptación Expresa** (evento RADIAN '033') para liberarla y luego la destruimos."

##### 3e — POST /v2/bills/validate (línea ~282)

"Ahora sí, enviamos la factura a Factus con `POST /v2/bills/validate`. Factus la valida contra las reglas de DIAN y nos responde con:

- **CUFE**: Código Único de Factura Electrónica (el identificador oficial).
- **Consecutivo**: el número de factura asignado.
- **Estado**: VALIDATED o PENDING.

Guardamos todo esto en nuestra tabla `ElectronicInvoice`."

##### 3f — Descontar crédito (línea ~310)

"El **modelo de negocio**: cada Factura Electrónica consume **1 crédito** del saldo de la empresa (`factusCreditBalance: decrement 1`).

Registramos la transacción en `FactusCreditTransaction` con tipo `CONSUMPTION` y auditamos todo."

##### 3g — Notificar y auditar (línea ~326)

"Si el saldo está bajo, enviamos una notificación a los administradores. Y registramos dos auditorías:

- `FACTUS_CREDITS_CONSUMED`: se descontó un crédito.
- `FACTUS_INVOICE_CREATED`: se creó la factura electrónica."

### 1.3 Resumen venta

"En resumen: la venta **siempre** se guarda en nuestra DB primero. Luego, **si aplica**, se genera la FE en Factus. Si Factus falla, la venta igual queda registrada, y se puede reintentar la FE después desde el panel de administración."

---

## 2. FLUJO DE DEVOLUCIÓN (5 min)

### 2.1 El usuario en el POS

"Para hacer una devolución, el usuario abre el `ReturnDialog` desde el POS. Puede:

1. Ingresar el ID de la venta original manualmente.
2. O llegar automáticamente si viene con `?return=ID` en la URL.

El sistema carga la venta original y muestra los productos con la **cantidad disponible para devolver** (lo que se vendió menos lo que ya se devolvió antes)."

### 2.2 Llega al endpoint POST /api/sales/return

"Cuando el usuario confirma, se llama a `POST /api/sales/return`. Abramos `app/api/sales/return/route.ts`."

#### Paso 1 — Validar venta original (línea ~27)

"**Primero**, buscamos la venta original en nuestra DB. Dos reglas:

- Si no existe → error 404.
- Si **ya es una devolución** → error. No se pueden anidar devoluciones."

#### Paso 2 — Validar cantidades (línea ~52)

"**Segundo**, validación de cantidades. Un producto no se puede devolver más veces de las que se vendió.

Calculamos cuánto se ha devuelto previamente (sumando todas las devoluciones hijas de esta venta) y verificamos que la nueva cantidad a devolver no exceda el saldo disponible.

Esto evita fraudes o errores donde se devuelvan 10 unidades de un producto del que solo se vendieron 5."

#### Paso 3 — Crear la devolución en nuestra DB (línea ~84)

"**Tercero**, creamos la **venta de devolución**:

- `isReturn = true`: identifica que esto es una devolución.
- `parentSaleId`: enlaza con la venta original.
- `total = negativo`: el total es negativo porque representa una reducción.
- `returnReason`: el motivo de la devolución.

Es una **venta**, pero con signo negativo. Así el reporte de ventas refleja tanto las ventas positivas como las devoluciones."

#### Paso 4 — Reintegrar inventario (línea ~114)

"**Cuarto**, revertimos el inventario. Por cada producto devuelto:

- **Incrementamos** el stock en `Product`.
- Creamos `StockMovement` con tipo `IN` — la operación inversa a la venta."

#### Paso 5 — Nota Crédito en Factus (opcional, línea ~142)

"**Quinto**, si el usuario marcó 'Crear Nota Crédito' en el modal, Factus está habilitado y la venta original tenía FE, generamos la **Nota Crédito Electrónica**."

##### 5a — Obtener rango para notas crédito (línea ~149)

"Buscamos el rango de numeración activo para **documento tipo '22'** (Nota Crédito). Es independiente del rango de facturas."

##### 5b — Obtener factura original de Factus (línea ~169)

"Necesitamos el **ID interno de Factus** de la factura original para referenciarla. Llamamos a `getInvoice()` con el consecutivo de la FE original."

##### 5c — Mapear al payload de nota crédito (línea ~173)

"Usamos `mapSaleToFactusCreditNote()` en `lib/factus/mappers.ts`. Este mapper es similar al de factura pero:

- `bill_number`: referencia a la factura original que se anula.
- `correction_concept_code: '1'`: indica 'Devolución total o parcial'.
- `customization_id: '20'`: identifica el tipo de nota crédito.
- El total se calcula incluyendo IVA."

##### 5d — POST /v2/credit-notes/validate (línea ~182)

"Enviamos la nota crédito a `POST /v2/credit-notes/validate`. Factus responde con CUFE, consecutivo y estado.

Guardamos el resultado en `ElectronicInvoice` con `saleId` apuntando a la venta de devolución."

##### 5e — Auditar (línea ~208)

"Registramos `FACTUS_CREDIT_NOTE_CREATED` en el log de auditoría."

### 2.3 Resumen devolución

"En resumen: la devolución también se guarda **siempre** en nuestra DB primero (con total negativo). El inventario se reintegra. Y **opcionalmente** se genera una Nota Crédito en Factus que anula electrónicamente la factura original ante DIAN."

---

## 3. ARQUITECTURA GENERAL (2 min)

### Los dos backends

```
┌─────────────┐         ┌──────────────┐         ┌──────────┐
│   FRONTEND  │ ◄─────► │  NUESTRA API │ ◄─────► │  NEON DB │
│   (Next.js) │         │  (Next.js)   │         │ (Prisma) │
└─────────────┘         └──────┬───────┘         └──────────┘
                               │
                               │ (vía factusRequest)
                               ▼
                        ┌──────────────┐
                        │    FACTUS    │◄────► DIAN
                        │  (PROV PROV) │
                        └──────────────┘
```

### Capa de Factus: 3 archivos clave

1. **`lib/factus/client.ts`**: El cliente HTTP. Se autentica con OAuth2 (password grant + refresh), maneja tokens, y provee `factusRequest()` como función base para todas las llamadas. También tiene helpers como `listPendingBills()`, `listNumberingRanges()`, `sendRadianEvent()`.

2. **`lib/factus/mappers.ts`**: Los **traductores**. Convierten los modelos de Prisma (`Sale`, `Customer`, `SaleItem`) en los payloads JSON que Factus/DIAN esperan. Hay dos mappers principales:
   - `mapSaleToFactusInvoice()` → para facturas.
   - `mapSaleToFactusCreditNote()` → para notas crédito.

3. **`lib/factus/reference-tables.ts`**: Las **tablas de referencia** con códigos DIAN: tipos de documento, códigos de impuestos, formas de pago, tipos de organización, etc.

### Modelo de negocio

"Hermes es **gratuito** en su núcleo (POS, inventario, clientes). La monetización viene de la reventa de créditos de Factus:

1. Hermes compra créditos a Factus al por mayor.
2. Las empresas clientes pagan a Hermes por créditos (con margen).
3. Cada FE exitosa descuenta 1 crédito del `factusCreditBalance` de la empresa.
4. Si no hay créditos, la venta se crea sin FE."

---

## 4. CONCLUSIÓN (30 seg)

"Hemos visto cómo Hermes orquesta dos backends de manera elegante:

- **Nuestra base de datos** es la fuente de verdad para el negocio: ventas, inventario, clientes.
- **Factus** es el brazo fiscal que se encarga de cumplir con la DIAN.
- Los **mappers** son el pegamento que traduce entre ambos mundos.

La clave del diseño: **el negocio nunca se detiene por Factus**. Si Factus falla o no hay créditos, la venta se concreta igual. La FE se puede generar después."

---

## Apéndice: Preguntas frecuentes

**¿Por qué la venta se guarda primero en nuestra DB y luego en Factus?**
Para que el negocio nunca dependa de Factus. Si Factus está caído, la venta igual se registra.

**¿Qué pasa si la FE falla después de descontar el crédito?**
Eso no debería pasar porque primero se envía a Factus y solo si funciona se descuenta el crédito. Pero si hay un error, la FE queda como PENDING y se puede reintentar desde el panel de administración.

**¿Por qué se limpian las facturas pendientes antes de crear una nueva?**
Factus tiene una restricción: solo una factura pendiente por rango de numeración. Si no limpiamos, la nueva factura sería rechazada.

**¿Una devolución puede tener nota crédito sin que la venta original haya tenido FE?**
No. La nota crédito siempre referencia una factura electrónica existente. Si la venta original no tuvo FE, la devolución tampoco puede tener nota crédito.
