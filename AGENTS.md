<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Reglas

1. **No hacer commits sin permiso**: No realizar commits ni pushes hasta que el usuario lo autorice explícitamente.
2. **No ejecutar build en cada cambio**: Solo ejecutar `pnpm build` antes de hacer un push, no en cada modificación que se hace durante el desarrollo.
3. **Verificar cambios localmente**: Antes de solicitar autorización para pushear, verificar que el código funciona correctamente en local.
4. **Confirmación de Eliminación**: Todas las acciones de eliminar (delete) deben incluir obligatoriamente un modal de confirmación antes de ejecutarse para evitar pérdidas accidentales de datos.
5. **Visibilidad de Acciones**: Los botones de acciones en las tablas (editar, eliminar, ver) siempre deben estar visibles y no ocultos bajo un efecto hover (ej. evitar `opacity-0 group-hover:opacity-100`).
6. **No "Cajas dentro de Cajas"**: Evitar renderizar componentes que ya tienen bordes y fondos propios (como `Table` de shadcn) dentro de contenedores `Card` con paddings, ya que esto genera un efecto visual redundante de "caja dentro de caja". En su lugar, se debe aplicar `p-0` al `Card` contenedor y remover los bordes/sombras del componente hijo mediante selectores de Tailwind (ej. `[&>div]:border-0 [&>div]:shadow-none`).
7. **Bordes Redondeados Estándar**: Usar siempre `rounded-lg` como radio estándar en todos los contenedores, botones, inputs, modals y tarjetas. Nunca usar `rounded-xl`, `rounded-2xl`, `rounded-full` en contenedores principales ni `rounded-md` o `rounded-sm` salvo para elementos muy pequeños como badges o chips.
8. **Menos complejidad es más útil**: Preferir vistas simples y consolidadas antes que muchos puntos de navegación. Si dos módulos comparten contexto (ej. insumos y compras), unificarlos en una sola vista con secciones claras. Evitar crear nuevas rutas cuando la funcionalidad puede integrarse en una existente.
9. **Forms en Modal (CTA Pattern)**: Para registrar nuevos datos, usar un botón tipo call-to-action en la esquina superior derecha de la vista (ej. "Registrar Compra", "Agregar Producto") que abra un modal centrado. No usar acordeones colapsables ni formularios en columnas laterales. El modal debe tener header con título y botón de cerrar, cuerpo con scroll para el formulario, y footer con acciones (cancelar/guardar). Esto mantiene la vista limpia y el formulario recibe toda la atención.
10. **Botón Cancelar en Modales**: Cuando se incluya un botón de "Cancelar" en el footer de un modal, usar siempre `variant="ghost"`. El botón de acción principal (Guardar, Registrar, etc.) debe usar el estilo por defecto (primary).
11. **Flujo de Pull Requests**: Para cualquier feature o fix significativo, siempre crear una rama dedicada (`feat/nombre` o `fix/nombre`), hacer los commits en esa rama, y crear un PR vía `gh pr create` antes de merge. No hacer commits directos a `main`. El flujo correcto es:
    ```bash
    git checkout -b feat/nueva-funcionalidad
    # hacer cambios
    git add -A && git commit -m "feat: descripción"
    git push -u origin feat/nueva-funcionalidad
    gh pr create --title "feat: descripción" --base main
    ```
12. **Sincronizar main tras producción**: Después de que los cambios sean desplegados a producción (PR mergeado), siempre volver a `main` y hacer `git pull` para mantener la rama local actualizada. Esto evita trabajar sobre código desactualizado.
    ```bash
    git checkout main && git pull
    ```
13. **Usar Componentes UI**: Siempre utilizar los componentes de `@components/ui/` para las interfaces (Button, Select, Input, Card, Dialog, etc.). Nunca usar elementos HTML nativos como `<button>`, `<select>`, `<input>` o `<table>` directamente; usar los wrappers de shadcn/ui en su lugar.
14. **Imports de Componentes**: Los imports de componentes deben seguir el patrón `@components/ui/nombre-componente` (ej. `import { Button } from '@/components/ui/button'`).
15. **Skeleton Loading States**: Cada ruta protegida debe tener su propio `loading.tsx` con un skeleton que **calque exactamente** la estructura visual de la página (grid cols, nº de cards, columnas de tabla, dimensiones). Al modificar el layout de cualquier página (cambiar título, añadir/quitar stat cards, modificar columnas de tabla, reordenar secciones), el `loading.tsx` correspondiente debe actualizarse para reflejar los cambios y evitar CLS (Cumulative Layout Shift). Usar únicamente el componente `Skeleton` de `@components/ui/skeleton` con clases de ancho (`w-*`) y alto (`h-*`) que coincidan con los elementos reales.

<!-- BEGIN:business-model -->
# Modelo de Negocio — Hermes

## Propuesta de Valor
- **Gratuito para el core del negocio**: POS, inventario, clientes, cajas, reportes, usuarios.
- **Monetización vía facturación electrónica**: Se compran créditos de Factus al por mayor y se revenden a los clientes con un margen.

## Flujo de Facturación Electrónica
1. Hermes compra créditos de facturación a Factus (X cantidad a X precio).
2. Las empresas clientes pagan a Hermes por Y créditos (Y > X, la diferencia es la ganancia).
3. Cada vez que se procesa una factura electrónica exitosamente, se descuenta 1 crédito del saldo de la empresa (`factusCreditBalance` en el modelo `Company`).
4. Si `factusCreditBalance <= 0`, el sistema NO intenta crear la FE y la venta se crea sin ella, con un warning en consola.

## Puntos Clave en Código
- **`Company.factusCreditBalance`**: saldo actual de créditos disponibles.
- **`Company.factusCreditTotal`**: total de créditos comprados históricamente.
- **`POST /api/factus/credits`**: endpoint para comprar créditos (incrementa ambos campos).
- **`GET /api/factus/credits`**: consulta saldo actual.
- **`app/api/sales/route.ts`**: al crear FE exitosamente, descuenta 1 crédito con `prisma.company.update({ data: { factusCreditBalance: { decrement: 1 } } })`.
- **`app/api/auth/register/route.ts`**: al registrarse una empresa, se auto-crean denominaciones de efectivo, configs del sistema y caja por defecto.

## TODO a Futuro
- Integración con pasarela de pago para compra automatizada de créditos.
- Panel admin global (GOD) para gestionar precios y créditos de todas las empresas.
- Histórico de transacciones de créditos (compras y consumos).
- Alertas cuando el saldo esté por debajo de un umbral.
<!-- END:business-model -->
