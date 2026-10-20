# Primer cliente: listado de verificación

Para abrirle la puerta a un cliente real y facturar con la DIAN por primera vez. Está ordenado por momento: antes, alta del cliente, primer día, cierre del día y qué hacer si algo sale mal.

Lo marcado con 🔎 no se ha podido comprobar desde el desarrollo (producción real, Factus real, la DIAN): hay que verificarlo en el entorno real. En la aplicación, las casillas se guardan en este navegador.

## 1. Antes de abrirle la puerta a un cliente

### Producción y despliegue

- [ ] Los PR #60 al #73 están desplegados. Prioridad: **#60 y #62**, que cierran dos brechas de seguridad (la configuración de Factus legible con cualquier sesión, y un ADMIN que podía darse el rol GOD).
- [ ] 🔎 En Vercel existen `ENCRYPTION_KEY` (sin ella no se pueden guardar ni leer credenciales de Factus), `CRON_SECRET`, el secreto de sesión y `DATABASE_URL` apuntando a la rama `production`. **Nunca cambies `ENCRYPTION_KEY`** después de guardar credenciales: dejarían de poder descifrarse.
- [ ] Borra las 5 variables viejas de Factus (`FACTUS_API_URL`, `FACTUS_CLIENT_ID`, `FACTUS_CLIENT_SECRET`, `FACTUS_USERNAME`, `FACTUS_PASSWORD`) y haz un redeploy.
- [ ] La tabla `PermissionRule` existe en `production` (migración `20261018120000_permission_rules`).
- [ ] 🔎 En `/god-dashboard` con el GOD: el menú tiene 7 entradas, la tabla de empresas muestra el mensaje de vacío y la guía reproduce videos.

### Cuenta y seguridad

- [ ] 🔎 Entra con el GOD de producción y confirma que su contraseña no es `god123` ni ninguna de las de ejemplo.
- [ ] En Usuarios de producción no hay usuarios de ejemplo (`admin@hermes.com`, `cajero@hermes.com`…): esos viven solo en las ramas de pruebas.
- [ ] 🔎 Neon: la ventana de restauración de `production` es corta (6 horas en el plan actual). Antes de tener datos reales, decide cómo vas a respaldar.

### Factus

- [ ] El cliente tiene cuenta de Factus de producción, resolución de numeración de la DIAN vigente y software habilitado.
- [ ] En Configuración del Sistema (GOD), tarjeta "Factus de la plataforma": la URL es la de producción **solo** cuando vas a facturar de verdad. Mientras pruebas, déjala en Sandbox.
- [ ] 🔎 Credenciales y rango de numeración de producción: nunca se han visto funcionar.

## 2. Alta del cliente

- [ ] El GOD crea una invitación y el cliente se registra con el enlace. Debe quedar con su empresa, una caja y las denominaciones de efectivo.
- [ ] El dueño ve la tarjeta "Permisos del equipo" en Configuración; el Gerente no.
- [ ] El dueño carga las credenciales de Factus de su empresa, **Probar conexión** responde bien, activa la facturación y elige su rango de numeración.
- [ ] El GOD activa los créditos comprados (detalle de la empresa, pestaña Factus, Activar) y el saldo se ve en el dueño.
- [ ] El dueño crea a su equipo y verifica con un cajero que no ve Inventario, Usuarios ni Configuración.

## 3. Primer día: la primera venta

Hazlo primero con el dueño presente y con una venta pequeña.

- [ ] Abrir caja con base conocida.
- [ ] Venta en efectivo **sin** factura electrónica: se cobra, baja el stock y no gasta créditos.
- [ ] Venta **con** factura electrónica a un cliente con cédula: la factura pasa a "Validada" y el saldo baja en 1.
- [ ] 🔎 Consulta el CUFE de esa factura en el portal de la DIAN.
- [ ] Descarga el PDF y el XML de esa factura.
- [ ] Devolución de esa venta con nota crédito.
- [ ] Cierra la caja: el reporte aparece en pantalla y solo se imprime con el botón.
- [ ] Una venta con el internet cortado: queda en cola y se sube sin duplicarse al reconectar.

## 4. Al terminar el día

- [ ] Los créditos cuadran: facturas validadas más o menos igual a créditos consumidos.
- [ ] No quedan facturas "Pendiente". Si hay, el reintento automático corre una vez al día en Vercel Hobby: usa el botón de reintentar manual.
- [ ] Auditoría (GOD): registra altas, cambios de permisos y movimientos de créditos.
- [ ] La caja cuadra con lo vendido.
- [ ] Revisa los logs de Vercel por errores 500.

## 5. Si algo sale mal

- **Facturas fallando:** desactiva el interruptor de facturación de esa empresa. Las ventas siguen funcionando sin factura.
- **Empresa con problemas de créditos:** el GOD puede bloquear su facturación desde el detalle de la empresa.
- **Despliegue roto:** en Vercel, promueve el despliegue anterior.
- **Permisos mal puestos:** "Restablecer" por rol o por persona devuelve a los valores por defecto.
