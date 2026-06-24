# Guía de Producción — Clips Hermes POS

## Herramientas

| Herramienta | Uso | Costo |
|------------|-----|-------|
| **OBS Studio** | Grabación de pantalla | Gratis |
| **ElevenLabs** | Voz en off (IA) | Plan gratis: 10min/mes |
| **CapCut** (desktop) | Edición de video | Gratis (sin marca) |

---

## Paso 1 — Grabar cada módulo en OBS

### Configurar OBS (una sola vez)
1. Abrí OBS → `+` en Fuentes → **Captura de pantalla**
2. Seleccioná la ventana del navegador con Hermes abierto
3. Resolución: **1080x1920** (vertical, 9:16). Para esto:
   - Abrí DevTools (F12) → toggle device toolbar → seleccioná "iPhone 14 Pro Max" o personalizado **430x932**
   - Ajustá OBS a esa proporción
4. Resampling: **48kHz**, calidad: **Alta**

### Grabar cada clip (uno por uno)

Por cada clip del `scripts-redes.md`:

1. Prepará la pantalla: navegá a la vista exacta que describa el clip
2. Hacé clic en **Grabar** en OBS
3. Ejecutá la acción lentamente (3-5 segundos por acción):
   - Clip 3 (POS): agregá 2-3 productos, mostrá el carrito, abrí cobro
   - Clip 4 (Peso): mostrá un producto por peso, cambiale el peso, mostrá la báscula
   - etc.
4. Dejá 2 segundos de silencio al inicio y al final
5. Pará la grabación → se guarda como `.mp4`
6. Nomenclatura: `clip-01-intro.mp4`, `clip-02-dashboard.mp4`, ...

**Duración por grabación:** 20-40 segundos

**Consejos:**
- Mové el mouse lento y fluido
- No hagás clic rápido; dejá ver cada transición
- Si te equivocás, repetí ese clip nomas

---

## Paso 2 — Generar voz en off

### Opción A: ElevenLabs (recomendada)

1. Andá a https://elevenlabs.io → Text to Speech
2. Voz sugerida: **"Antoni"** (español latino neutro, claro) o **"Daniel"** (más enérgico)
3. Pegá el texto del audio de cada clip
4. Descargá como `.mp3`

**Ajustes:**
- Stability: 50%
- Similarity: 75%
- Style Exaggeration: 30%

### Opción B: TikTok TTS (gratis, sin registro)

Usá https://tiktoktts.com/:
1. Pegá el texto
2. Voz: **"Spanish (Latin American) - Miguel"** (masculino) o **"Spanish (Latin American) - Isabella"** (femenino)
3. Descargá

**Nomenclatura:** `voz-01-intro.mp3`, `voz-02-dashboard.mp3`, ...

---

## Paso 3 — Editar en CapCut

### Configurar proyecto
1. CapCut → Nuevo proyecto → **1920x1080 vertical** (o 1080x1920)
2. Ajustá la línea de tiempo a **30 fps**

### Armar cada clip

Para cada clip:

1. **Importá** el `.mp4` grabado + el `.mp3` de voz
2. Arrastrá el video a la línea de tiempo
3. Arrastrá el audio debajo
4. **Ajustá duración:**
   - Cortá el video para que coincida con el inicio/fin del audio
   - Si el video es más corto: freeze frame en el último frame
   - Si el audio es más corto: dejá 1-2 segundos de silencio al final
5. **Zoom:**
   - Donde haya que enfocar algo (botón, modal), agregá un keyframe de zoom
   - Escala: 100% → 150% en 0.5 segundos
6. **Texto en pantalla:**
   - Agregá el nombre del módulo: fuente "Semibold", color blanco, sombra negra
   - Tamaño grande, centrado arriba
   - Aparece al inicio, dura 2 segundos, se desvanece
7. **Subtítulos opcionales:**
   - CapCut tiene auto-caption en español. Activálo

### Transiciones entre clips

Usá un **Slide izquierda→derecha o arriba→abajo** de 0.3 segundos (para dar sensación de swipe).

### Exportar

- **Resolución:** 1080x1920
- **Formato:** MP4 H.264
- **FPS:** 30
- **Bitrate:** 10-15 Mbps
- **Audio:** 320 kbps

---

## Paso 4 — Compilar todo en un video largo

1. Creá un nuevo proyecto en CapCut
2. Importá todos los clips terminados en orden
3. Agregá la transición de swipe entre cada uno
4. Al final, agregá una pantalla negra de 3 segundos con texto:
   "Descarga Hermes — el link está en nuestra bio"
5. Exportá como **hermes-completo.mp4**

---

## Checklist por Clip

| # | Grabado | Voz | Editado | OK |
|---|---------|-----|---------|----|
| 1 | ☐ | ☐ | ☐ | ☐ |
| 2 | ☐ | ☐ | ☐ | ☐ |
| 3 | ☐ | ☐ | ☐ | ☐ |
| ... | ☐ | ☐ | ☐ | ☐ |
| 20 | ☐ | ☐ | ☐ | ☐ |
| **Compilado** | | | | ☐ |

---

## Notas

- **Duración ideal por clip:** 30-45 segundos
- **Cada clip se publica individual** (TikTok, Reels, Shorts)
- **El compilado se usa** para YouTube o web
- **Hashtags:** #HermesPOS #FacturacionElectronica #POS #GestionEmpresarial #DIAN
