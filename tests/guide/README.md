# Guía de uso en video

Los videos de https://…/guia se **graban con Playwright** contra una base de pruebas, así siempre
muestran la interfaz actual y se pueden regenerar cuando algo cambia.

## Regenerarlos

1. Base de pruebas con el seed (`pnpm db:seed`) y, para el video de facturación electrónica, la
   empresa con **Factus habilitado, créditos y sin credenciales propias** (usa las `FACTUS_*` del
   sandbox del `.env` del servidor de pruebas).
2. Servidor de pruebas contra esa base, o `E2E_DATABASE_URL` para que Playwright lo arranque:

```bash
E2E_DATABASE_URL="postgresql://…base-de-pruebas…" pnpm guide:record      # graba guide-videos/raw/*.webm
pnpm guide:record --grep "vender-y-cobrar"                             # un solo video (corre antes "00")
pnpm guide:build                                                       # webm -> mp4 + portadas + media.json
```

`guide:build` necesita `ffmpeg`. Escribe en `public/guia/` y `lib/guide/media.json`; esos son los
únicos archivos que se versionan (`guide-videos/` es material de trabajo y está en `.gitignore`).

Los videos comparten estado y por eso van en serie, en orden: `00` prepara la base (borra los datos de
ejemplo de grabaciones anteriores, cierra la caja, crea el producto por peso y el cliente), `01` abre la
caja, `07` la cierra. Si regrabas solo uno, incluye antes los que lo preparan (por ejemplo
`--grep "00|01|05"`). Los de plataforma (`50`–`55`) se graban con la sesión GOD y restauran los créditos
pendientes de la empresa de pruebas. Graba contra un servidor de producción (`next build` + `next start`):
con `next dev` los diálogos se renderizan demasiado lento.

## Guía por rol

`/guia` filtra los videos según el rol de quien la abre: cada video apunta a un módulo (`href`) y los
roles que lo usan salen de `NAV_ACCESS` en `lib/navigation.ts`, la misma fuente del menú lateral. Sin
sesión se ve todo menos Plataforma; el GOD ve todo. Los videos de Plataforma se publican con un nombre de
archivo con sufijo aleatorio (no es control de acceso, solo evita que se adivine la URL).

## Cómo está armado

- `lib/guide/content.ts`: **fuente única** de títulos, resúmenes y pasos. De ahí salen los subtítulos
  del video y el texto de la página; no pueden desfasarse. El grabador falla si hay más o menos
  pasos grabados que subtítulos.
- `tests/guide/lib/overlay.ts`: subtítulos «PASO n DE N», cursor visible, anillo en cada clic y chip
  de teclas. Se inyecta solo en la grabación; la app no lo incluye.
- `tests/guide/lib/recorder.ts`: ritmo de lectura (el tiempo de cada paso crece con el largo del texto).
- `tests/guide/NN-*.guide.ts`: un test por video, agrupados por sección (venta, operación, catálogo, control, plataforma).

Los videos no llevan audio: se entienden sin sonido, que es lo que funciona en una tienda con ruido.
