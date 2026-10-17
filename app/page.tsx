/*
 * THESIS: Hermes se explica enseñando el mostrador funcionando, no prometiéndolo. Rechaza el héroe
 *   centrado con degradado y las tarjetas iguales de icono + título + texto.
 * OWN-WORLD: grafito #0D1117 / panel #151A22, líneas de 1px, Geist + Geist Mono, un solo azul de
 *   acción, verde/ámbar solo como estado. Sin sombras ni degradados.
 * STORY: Un dueño de tienda entiende en segundos que el POS es gratis y que solo paga por factura
 *   electrónica; ve el ticket y el estado de la factura; pulsa "Comenzar gratis".
 * FIRST VIEWPORT: titular a la izquierda con la oferta y dos botones; a la derecha el POS de ejemplo
 *   (catálogo + ticket con total grande y estado de la factura), etiquetado como ejemplo.
 * FORM: consola de turno (DESIGN.md), versión Persuade.
 */
import Link from "next/link"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { StatStrip } from "@/components/dashboard/stat-card"
import {
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Users,
  Wallet,
  ArrowRight,
  Store,
} from "lucide-react"

const WHATSAPP_URL = "https://wa.me/573175227672?text=Hola,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20Hermes"

const features = [
  {
    icon: ShoppingCart,
    tag: "POS",
    title: "Punto de venta",
    description:
      "Registra ventas al instante con una interfaz rápida e intuitiva. Soporta múltiples formas de pago, descuentos por ítem y globales, y cierre de caja automatizado.",
  },
  {
    icon: Package,
    tag: "INVENTARIO",
    title: "Inventario",
    description:
      "Gestiona tu stock con control de entradas, salidas y ajustes. Recibe alertas de inventario bajo y lleva un historial completo de movimientos.",
  },
  {
    icon: FileText,
    tag: "DIAN",
    title: "Facturación electrónica",
    description:
      "Factura electrónicamente ante la DIAN sin complicaciones. Hermes se encarga de todo el proceso técnico: firma digital, envío y recepción de la respuesta.",
  },
  {
    icon: BarChart3,
    tag: "REPORTES",
    title: "Reportes",
    description:
      "Visualiza tus ventas diarias, semanales y mensuales con gráficos claros. Conoce tus productos más vendidos, márgenes de ganancia y tendencias.",
  },
  {
    icon: Users,
    tag: "EQUIPO",
    title: "Clientes y usuarios",
    description:
      "Administra tu base de clientes con historial de compras y datos de contacto. Controla el acceso de tu equipo con roles y permisos.",
  },
  {
    icon: Wallet,
    tag: "CAJAS",
    title: "Cajas multi-sesión",
    description:
      "Abre y cierra cajas de forma independiente, con control total de ingresos y egresos. Ideal para negocios con múltiples turnos o puntos de venta.",
  },
]

const steps = [
  {
    title: "Crea tu cuenta",
    description: "Regístrate en segundos sin costo. No necesitas tarjeta de crédito ni contratos largos.",
  },
  {
    title: "Configura tu negocio",
    description: "Agrega tus productos, categorías y datos de empresa. En menos de 5 minutos tienes todo listo.",
  },
  {
    title: "Empieza a vender",
    description: "Registra tu primera venta al instante. Tus datos se sincronizan automáticamente, incluso sin internet.",
  },
]

// Datos sintéticos de la vista de ejemplo del primer viewport.
const sampleProducts = [
  { name: "Leche Entera 1L", price: "$ 4.200", stock: "3 BAJO", low: true, qty: 2 },
  { name: "Pan Tajado Grande", price: "$ 6.200", stock: "18 u", qty: 1 },
  { name: "Jugo Hit Tropical 400ml", price: "$ 2.992", stock: "50 u", qty: 3 },
  { name: "Agua Cristal 500ml", price: "$ 1.500", stock: "80 u" },
  { name: "Papas Fritas Grandes", price: "$ 5.000", stock: "40 u" },
  { name: "Coca-Cola 350ml", price: "$ 2.502", stock: "100 u" },
]

const sampleTicket = [
  { name: "Leche Entera 1L", qty: 2, total: "$ 8.400" },
  { name: "Pan Tajado Grande", qty: 1, total: "$ 6.200" },
  { name: "Jugo Hit Tropical 400ml", qty: 3, total: "$ 8.976" },
]

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-md border border-seam-strong bg-elevated">
        <Store className="size-4 text-info" />
      </span>
      <span className="font-mono text-sm font-semibold tracking-[0.14em]">HERMES</span>
    </span>
  )
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </span>
  )
}

function CounterPreview() {
  return (
    <figure
      aria-label="Vista de ejemplo del punto de venta"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <figcaption className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
          <PanelLabel>Caja abierta</PanelLabel>
        </span>
        <span className="rounded-sm bg-elevated px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-faint">
          EJEMPLO
        </span>
      </figcaption>

      <div className="grid sm:grid-cols-[1fr_minmax(0,240px)]">
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-2">
          {sampleProducts.map((p) => (
            <div
              key={p.name}
              className={`flex min-h-[84px] flex-col justify-between gap-2 bg-card p-3 ${p.qty ? "ring-1 ring-inset ring-info" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 text-[13px] leading-tight font-medium">{p.name}</span>
                {p.qty && (
                  <span className="shrink-0 rounded-sm bg-info/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-info">
                    ×{p.qty}
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="font-mono text-base leading-none font-semibold tabular-nums">{p.price}</span>
                <span className={`flex items-center gap-1 font-mono text-[10px] whitespace-nowrap ${p.low ? "text-warning" : "text-muted-foreground"}`}>
                  {p.low && <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />}
                  {p.stock}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col border-t border-border bg-background sm:border-t-0 sm:border-l">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <PanelLabel>Ticket</PanelLabel>
            <span className="font-mono text-[11px]">3 ítems</span>
          </div>
          <ul className="flex-1 divide-y divide-border">
            {sampleTicket.map((line, i) => (
              <li
                key={line.name}
                className="landing-rise flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]"
                style={{ animationDelay: `${0.25 + i * 0.12}s` }}
              >
                <span className="min-w-0 truncate">
                  <span className="mr-1.5 font-mono text-xs text-muted-foreground">{line.qty}×</span>
                  {line.name}
                </span>
                <span className="shrink-0 font-mono whitespace-nowrap tabular-nums">{line.total}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-3 py-3">
            <div className="flex items-end justify-between">
              <PanelLabel>Total</PanelLabel>
              <span className="font-mono text-[28px] leading-none font-semibold tracking-tight tabular-nums">$ 23.576</span>
            </div>
            <div className="mt-3 flex h-11 items-center justify-between rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">
              Cobrar
              <kbd className="rounded-sm border border-white/30 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.06em]">ESPACIO</kbd>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-border px-3 py-2.5 text-xs">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            <span className="text-success">Factura electrónica validada por la DIAN</span>
          </div>
        </div>
      </div>
    </figure>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Hermes, inicio">
            <Wordmark />
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
            <Link href="#features" className="hidden px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              Funcionalidades
            </Link>
            <Link href="#pricing" className="hidden px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              Precios
            </Link>
            <ThemeToggle />
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* Primer viewport: la oferta y el producto trabajando */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-20">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                POS para negocios de Colombia
              </p>
              <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[56px]">
                El POS de tu negocio es gratis. Pagas solo si facturas electrónicamente.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Ventas, inventario, cajas y reportes sin mensualidad. Funciona sin internet y emite factura
                electrónica DIAN cuando la necesites.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href={WHATSAPP_URL} target="_blank" className={buttonVariants({ size: "lg" })}>
                  Comenzar gratis
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="#features" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                  Ver qué incluye
                </Link>
              </div>
            </div>
            <CounterPreview />
          </div>
        </section>

        <section aria-label="Datos clave" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <StatStrip
            cells={[
              { label: "Core del negocio", value: "Gratis", detail: "POS, inventario, cajas y reportes" },
              { label: "Conexión", value: "Offline", detail: "Funciona sin internet y sincroniza después" },
              { label: "Facturación", value: "DIAN", detail: "Electrónica, por créditos" },
              { label: "Puesta en marcha", value: "1 clic", detail: "Sin instalación" },
            ]}
          />
        </section>

        {/* Funcionalidades como hoja de especificaciones */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Todo lo que tu negocio necesita
            </h2>
            <p className="mt-3 text-muted-foreground">
              Lo esencial para operar el mostrador cada día, sin módulos que no vas a usar.
            </p>
          </div>
          <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.tag} className="grid gap-3 px-5 py-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
                  <dt className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
                    <span>
                      <span className="block font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground">{f.tag}</span>
                      <span className="mt-1 block font-semibold">{f.title}</span>
                    </span>
                  </dt>
                  <dd className="text-[15px] leading-relaxed text-muted-foreground">{f.description}</dd>
                </div>
              )
            })}
          </dl>
        </section>

        {/* Cómo empezar */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="mb-10 text-3xl font-semibold tracking-tight sm:text-4xl">Empieza en tres pasos</h2>
            <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title} className="bg-card p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full border border-seam-strong font-mono text-xs">
                      {i + 1}
                    </span>
                    <h3 className="font-semibold">{step.title}</h3>
                  </div>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Precios */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sin costos ocultos</h2>
            <p className="mt-3 text-muted-foreground">
              Usa Hermes sin pagar nada. Solo invierte en facturación electrónica cuando la necesites.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-seam-strong bg-card p-6">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                <PanelLabel>Siempre gratis</PanelLabel>
              </div>
              <h3 className="mt-4 text-xl font-semibold">Core del negocio</h3>
              <p className="mt-3 font-mono text-4xl font-semibold tabular-nums">
                $0 <span className="text-sm font-normal text-muted-foreground">/mes</span>
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  "Punto de venta completo",
                  "Gestión de inventario",
                  "Reportes y estadísticas",
                  "Clientes y usuarios",
                  "Cajas multi-sesión",
                  "Soporte offline",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-muted-foreground">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-success" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
                <PanelLabel>Pago por uso</PanelLabel>
              </div>
              <h3 className="mt-4 text-xl font-semibold">Facturación electrónica</h3>
              <p className="mt-3 font-mono text-4xl font-semibold">Créditos</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Un crédito por cada factura validada.{" "}
                <Link href={WHATSAPP_URL} target="_blank" className="text-info underline-offset-4 hover:underline">
                  Consulta el valor por factura
                </Link>
                .
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  "Envío automático a la DIAN y recepción de la respuesta",
                  "Notas crédito por devoluciones",
                  "Rango de numeración DIAN configurado en Hermes",
                  "Sin mensualidad obligatoria",
                  "Créditos prepagados por transferencia",
                  "Compras créditos solo cuando los necesites",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-muted-foreground">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm">
            <PanelLabel>Para activar la facturación electrónica</PanelLabel>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Necesitas el RUT, el certificado de existencia de la Cámara de Comercio (con máximo 30 días de expedido),
              la cédula del representante legal, un rango de numeración autorizado por la DIAN y el certificado de
              firma digital de tu empresa. La activación puede tardar hasta 3 días hábiles. El POS funciona desde el
              primer día, sin nada de esto.
            </p>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Sin contrato de permanencia en Hermes.</p>
        </section>

        {/* Cierre */}
        <section className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">Abre tu primera caja hoy</h2>
              <p className="mt-2 text-muted-foreground">
                Únete a los negocios que ya confían en Hermes para gestionar sus ventas, inventario y facturación electrónica.
              </p>
            </div>
            <Link href={WHATSAPP_URL} target="_blank" className={buttonVariants({ size: "lg" })}>
              Comenzar ahora
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <Wordmark />
          <nav aria-label="Pie" className="flex items-center gap-6">
            <Link href="#features" className="transition-colors hover:text-foreground">Funcionalidades</Link>
            <Link href="#pricing" className="transition-colors hover:text-foreground">Precios</Link>
            <Link href="/login" className="transition-colors hover:text-foreground">Iniciar sesión</Link>
          </nav>
          <p className="font-mono tracking-[0.06em]">HECHO EN COLOMBIA &middot; 2026</p>
        </div>
      </footer>
    </div>
  )
}
