# Pruebas E2E

Escriben datos reales (ventas, productos, cajas, reglas de permisos, usuarios de prueba), así que **siempre**
deben apuntar a una base de pruebas, nunca a producción. Playwright arranca el servidor con
`E2E_DATABASE_URL`, no con el `DATABASE_URL` de `.env`.

```bash
E2E_DATABASE_URL="postgresql://…/neondb?sslmode=require" pnpm test:e2e
```

## La rama `e2e` de Neon

Las pruebas usan la rama `e2e` del proyecto `hermes` en Neon (la de producción es `production`; la de tu
servidor local es `desarrollo`). Parte de `production` y se siembra con los datos de ejemplo
(`prisma/seed.ts`): la empresa "Mi Empresa", `admin@hermes.com` / `admin123`, `gerente@hermes.com` /
`gerente123`, `cajero@hermes.com` / `cajero123`, productos, cajas y medios de pago. El GOD es
`god@hermes.com` / `god123` **solo en esta rama**.

Para dejarla como nueva (por ejemplo si se ensució con datos de pruebas que fallaron):

1. En Neon, restablece la rama `e2e` desde su padre (`production`), o bórrala y créala de nuevo.
2. Si el esquema cambió, aplica a esa rama las migraciones de `prisma/migrations/` que falten.
3. Siémbrala, con la URL de **esa rama** (revisa el host antes de correr nada):
   ```bash
   DATABASE_URL="<url de la rama e2e>" pnpm exec tsx prisma/seed.ts
   ```
4. Pon la contraseña de pruebas al GOD de la rama (la copia de producción trae la real):
   actualiza `passwordHash` de `god@hermes.com` con el hash bcrypt de `god123`.

## Cosas que conviene saber

- **Primer arranque lento.** Con `next dev`, cada ruta compila la primera vez que se visita, y el login de
  `auth.setup.ts` puede agotar su tiempo. Si falla solo el setup, repite: ya compiló. Lo más cómodo es
  levantar el servidor aparte y apuntar a él con `E2E_BASE_URL=http://localhost:3101`.
- **Precalentamiento de la base.** `global-setup.ts` espera hasta un minuto a que la base responda antes
  de empezar (Neon despierta el cómputo de una rama inactiva).
- **Limpieza.** Las pruebas de permisos y de usuarios deshacen lo que hacen. Si una corrida se corta a la
  mitad, quedan reglas o un dueño de prueba (`owner.e2e@hermes.test`); se borran en la siguiente corrida
  de `permissions-owner` o restableciendo la rama.
- **Secuencia.** Las pruebas comparten base y una caja abierta, por eso van en serie (un solo worker).
