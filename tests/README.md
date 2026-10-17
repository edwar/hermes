# Pruebas de Hermes

## Unitarias (Vitest)

Lógica pura y de negocio, sin base de datos ni red.

```bash
pnpm test          # una vez
pnpm test:watch    # en modo observación
```

Cubren el cifrado de credenciales (`lib/crypto`), el adaptador de Factus (cada respuesta de la DIAN
se traduce a validada, pendiente o rechazada) y la emisión de documentos (`lib/invoicing/emit`):
idempotencia, crédito descontado solo al validar, reintentos con backoff y concurrencia.

## End-to-end (Playwright)

Recorren la aplicación real en un navegador. **Escriben datos** (ventas, productos, sesiones de caja,
credenciales de Factus de prueba), así que deben apuntar a una **base de pruebas**, nunca a producción.

1. Crea una rama de Neon (o una base local) con el seed: `DATABASE_URL=<base-de-pruebas> pnpm db:seed`.
2. Ejecuta:

```bash
E2E_DATABASE_URL="postgresql://…base-de-pruebas…" pnpm test:e2e
```

Playwright arranca `next dev` en el puerto 3101 con esa base (no con el `.env`). Si ya tienes un servidor
de pruebas corriendo, usa `E2E_BASE_URL=http://localhost:3101 pnpm test:e2e`.

| Variable | Para qué |
|---|---|
| `E2E_DATABASE_URL` | Base de pruebas con la que arranca el servidor (obligatoria sin `E2E_BASE_URL`) |
| `E2E_BASE_URL` | Usar un servidor ya levantado en vez de arrancar uno |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | Usuario administrador (por defecto el del seed) |
| `E2E_CRON_SECRET` | Debe coincidir con el `CRON_SECRET` del servidor (por defecto `e2e-cron-secret`) |
| `E2E_SERVER_CMD` | Comando alterno para arrancar el servidor |

Proyectos: `public` y `public-mobile` (sin sesión: landing, login, API sin autenticación), `app`
(con sesión de administrador: POS, inventario, facturación, roles, marco de la aplicación).
Las pruebas del POS cierran y abren la caja por sí mismas. `pnpm test:e2e:ui` abre el modo interactivo.
