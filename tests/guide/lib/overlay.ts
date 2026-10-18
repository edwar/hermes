import type { BrowserContext } from "@playwright/test"

/**
 * Overlay que aparece SOLO en las grabaciones de la guía (lo inyecta el grabador, no la app):
 *  - subtítulo del paso actual («PASO 2 DE 6» + texto),
 *  - cursor visible y un anillo en cada clic (Playwright no dibuja el puntero),
 *  - chip con la tecla que se pulsa (p. ej. ESPACIO).
 * El estado vive en sessionStorage para sobrevivir a las navegaciones completas de página.
 */
export async function installOverlay(context: BrowserContext) {
  await context.addInitScript(() => {
    const CAPTION = "__guide_caption"
    const CURSOR = "__guide_cursor"

    const css = `
      nextjs-portal, [data-nextjs-dev-tools-button], [data-next-badge-root] { display: none !important; }
      /* El desenfoque del fondo de los diálogos hace que cada cuadro tarde cientos de ms en pintarse sin GPU. */
      *, *::before, *::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
      #__g-cursor { position: fixed; left: 0; top: 0; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%;
        border: 2px solid #79C0FF; background: rgba(121,192,255,.2); z-index: 2147483646; pointer-events: none;
        transition: transform .16s linear; }
      .__g-ripple { position: fixed; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%; border: 3px solid #79C0FF;
        z-index: 2147483646; pointer-events: none; animation: __g-ripple .7s ease-out forwards; }
      @keyframes __g-ripple { from { transform: scale(.6); opacity: .95; } to { transform: scale(2.6); opacity: 0; } }
      #__g-caption { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); z-index: 2147483647; pointer-events: none;
        display: flex; align-items: center; gap: 16px; max-width: 80%; padding: 13px 20px; border-radius: 6px;
        background: rgba(13,17,23,.96); border: 1px solid #343B47; color: #E6EDF3;
        font: 600 21px/1.3 var(--font-geist, system-ui, sans-serif); letter-spacing: -.005em; transition: opacity .25s; }
      #__g-caption .__g-step { flex: none; font: 500 12px/1 var(--font-geist-mono, ui-monospace, monospace); letter-spacing: .1em;
        color: #79C0FF; border: 1px solid #343B47; border-radius: 3px; padding: 6px 8px; }
      #__g-key { position: fixed; left: 50%; bottom: 104px; transform: translateX(-50%); z-index: 2147483647; pointer-events: none;
        font: 600 16px/1 var(--font-geist-mono, ui-monospace, monospace); letter-spacing: .12em; color: #0D1117; background: #E6EDF3;
        border-radius: 5px; padding: 9px 14px; opacity: 0; transition: opacity .15s; }
      #__g-key.on { opacity: 1; }
    `

    function ensure() {
      if (!document.documentElement) return
      if (!document.getElementById("__g-style")) {
        const style = document.createElement("style")
        style.id = "__g-style"
        style.textContent = css
        document.documentElement.appendChild(style)
      }
      if (!document.getElementById("__g-cursor")) {
        const cursor = document.createElement("div")
        cursor.id = "__g-cursor"
        const saved = sessionStorage.getItem(CURSOR)
        const [x, y] = saved ? saved.split(",").map(Number) : [-100, -100]
        cursor.style.transform = `translate(${x}px, ${y}px)`
        document.documentElement.appendChild(cursor)
      }
      if (!document.getElementById("__g-key")) {
        const key = document.createElement("div")
        key.id = "__g-key"
        document.documentElement.appendChild(key)
      }
      renderCaption()
    }

    function renderCaption() {
      const raw = sessionStorage.getItem(CAPTION)
      let el = document.getElementById("__g-caption")
      if (!raw) {
        el?.remove()
        return
      }
      const { step, total, text } = JSON.parse(raw) as { step: number; total: number; text: string }
      if (!el) {
        el = document.createElement("div")
        el.id = "__g-caption"
        document.documentElement.appendChild(el)
      }
      const label = step > 0 ? `PASO ${step} DE ${total}` : "GUÍA"
      if (el.dataset.key !== `${step}|${text}`) {
        el.dataset.key = `${step}|${text}`
        el.innerHTML = ""
        const tag = document.createElement("span")
        tag.className = "__g-step"
        tag.textContent = label
        const msg = document.createElement("span")
        msg.textContent = text
        el.append(tag, msg)
      }
    }

    // La app (React) puede reemplazar nodos de <html>: se restauran periódicamente.
    window.addEventListener("load", () => setTimeout(ensure, 250))
    setInterval(ensure, 400)

    document.addEventListener(
      "mousemove",
      (e) => {
        const c = document.getElementById("__g-cursor")
        if (c) c.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
        sessionStorage.setItem(CURSOR, `${e.clientX},${e.clientY}`)
      },
      true
    )
    document.addEventListener(
      "mousedown",
      (e) => {
        const r = document.createElement("div")
        r.className = "__g-ripple"
        r.style.left = `${e.clientX}px`
        r.style.top = `${e.clientY}px`
        document.documentElement.appendChild(r)
        setTimeout(() => r.remove(), 800)
      },
      true
    )
    ;(window as unknown as Record<string, unknown>).__guideCaption = (step: number, total: number, text: string | null) => {
      if (text === null) sessionStorage.removeItem(CAPTION)
      else sessionStorage.setItem(CAPTION, JSON.stringify({ step, total, text }))
      ensure()
    }
    ;(window as unknown as Record<string, unknown>).__guideKey = (label: string) => {
      ensure()
      const k = document.getElementById("__g-key")
      if (!k) return
      k.textContent = label
      k.classList.add("on")
      setTimeout(() => k.classList.remove("on"), 1100)
    }
  })
}
