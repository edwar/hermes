import Link from "next/link"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import {
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Users,
  Wallet,
  Zap,
  ArrowRight,
  CheckCircle,
  Smartphone,
  Receipt,
  Store,
} from "lucide-react"

const features = [
  {
    icon: ShoppingCart,
    title: "Punto de Venta",
    description:
      "Registra ventas al instante con una interfaz rápida e intuitiva. Soporta múltiples formas de pago, descuentos por ítem y globales, y cierre de caja automatizado.",
  },
  {
    icon: Package,
    title: "Inventario",
    description:
      "Gestiona tu stock con control de entradas, salidas y ajustes. Recibe alertas de inventario bajo y lleva un historial completo de movimientos.",
  },
  {
    icon: FileText,
    title: "Facturación Electrónica",
    description:
      "Factura electrónicamente ante la DIAN sin complicaciones. Hermes se encarga de todo el proceso técnico: firma digital, envío y recepción de la respuesta.",
  },
  {
    icon: BarChart3,
    title: "Reportes",
    description:
      "Visualiza tus ventas diarias, semanales y mensuales con gráficos claros. Conoce tus productos más vendidos, márgenes de ganancia y tendencias.",
  },
  {
    icon: Users,
    title: "Clientes y Usuarios",
    description:
      "Administra tu base de clientes con historial de compras y datos de contacto. Controla el acceso de tu equipo con roles y permisos.",
  },
  {
    icon: Wallet,
    title: "Cajas Multi-sesión",
    description:
      "Abre y cierra cajas de forma independiente, con control total de ingresos y egresos. Ideal para negocios con múltiples turnos o puntos de venta.",
  },
]

const steps = [
  {
    number: "01",
    title: "Crea tu cuenta",
    description:
      "Regístrate en segundos sin costo. No necesitas tarjeta de crédito ni contratos largos.",
  },
  {
    number: "02",
    title: "Configura tu negocio",
    description:
      "Agrega tus productos, categorías y datos de empresa. En menos de 5 minutos tienes todo listo.",
  },
  {
    number: "03",
    title: "Empieza a vender",
    description:
      "Registra tu primera venta al instante. Tus datos se sincronizan automáticamente, incluso sin internet.",
  },
]

const highlights = [
  { icon: Zap, text: "Sin instalación. Funciona en cualquier dispositivo con internet." },
  { icon: Smartphone, text: "Diseñado para funcionar sin conexión. Tus ventas nunca se detienen." },
  { icon: Receipt, text: "Cumplimiento DIAN incluido. Facturación electrónica en 1 clic." },
  { icon: Store, text: "Gratuito para el core del negocio. Paga solo si necesitas facturar electrónicamente." },
]

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 dark:bg-[radial-gradient(ellipse_at_top_right,rgba(0,79,110,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.06),transparent_50%)] bg-[radial-gradient(ellipse_at_top_right,rgba(0,79,110,0.06),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.03),transparent_50%)]" />
      <div
        className="pointer-events-none absolute inset-0 dark:opacity-[0.03] hidden dark:block"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:hidden"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <style>{`
        @keyframes float { 0%,100% { transform: translate(0,0) rotate(0deg); } 25% { transform: translate(30px,-30px) rotate(3deg); } 50% { transform: translate(-20px,-40px) rotate(-2deg); } 75% { transform: translate(40px,20px) rotate(4deg); } }
        @keyframes slideUp { from { opacity:0; transform: translateY(30px); } to { opacity:1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .animate-slide-up { animation: slideUp 0.8s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
      `}</style>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-1">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-[10px] font-black text-primary-foreground shadow-lg shadow-primary/30">
            H
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground/90">ermes</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="group relative rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Iniciar sesi&oacute;n
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto flex min-h-[calc(100dvh-200px)] max-w-6xl flex-col items-center justify-center px-6 pb-20 pt-10 text-center sm:px-12">
          <div className="animate-slide-up max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Zap className="size-3.5 text-primary" />
              Sistema POS moderno para Colombia
            </div>

            <h1 className="mb-6 text-4xl font-black leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Tu negocio{" "}
              <span className="bg-gradient-to-r from-[#004F6E] via-[#1A7A9E] to-[#4A9EBD] bg-clip-text text-transparent">
                vuela
              </span>
              <br />
              con Hermes
            </h1>

            <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Punto de venta, facturaci&oacute;n electr&oacute;nica DIAN, inventario, reportes y
              gesti&oacute;n de clientes. Todo en un solo lugar, sin complicaciones y sin costo
              para lo esencial de tu negocio.
            </p>

            <Link
              href="https://wa.me/573175227672?text=Hola,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20Hermes"
              target="_blank"
              className="group relative inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:brightness-125"
            >
              Comenzar gratis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div
            className="mt-20 grid w-full max-w-3xl grid-cols-2 gap-6 border-t border-border pt-10 text-center animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            {[
              { value: "Gratis", label: "Core del negocio" },
              { value: "100%", label: "Online / Offline" },
              { value: "DIAN", label: "Facturación electrónica" },
              { value: "1 clic", label: "Puesta en marcha" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-lg font-bold text-foreground/90">{item.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Highlights */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-12">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {highlights.map((item, i) => (
                <div
                  key={i}
                  className="animate-slide-up flex items-start gap-4 rounded-lg border border-border bg-card p-5"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="size-5 text-primary" />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-20 sm:px-12">
          <div className="mb-14 text-center animate-slide-up">
            <h2 className="mb-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Todo lo que tu negocio necesita
            </h2>
            <p className="mx-auto max-w-lg text-muted-foreground">
              Un sistema completo, dise&ntilde;ado para negocios colombianos. Desde la
              gesti&oacute;n de inventario hasta la facturaci&oacute;n electr&oacute;nica.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="animate-slide-up group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="mb-2 text-base font-bold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:px-12">
            <div className="mb-14 text-center animate-slide-up">
              <h2 className="mb-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Empieza en 3 pasos
              </h2>
              <p className="mx-auto max-w-lg text-muted-foreground">
                Configurar Hermes es tan r&aacute;pido que no interrumpe tu d&iacute;a.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((step, i) => (
                <div
                  key={step.number}
                  className="animate-slide-up relative text-center"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-black text-primary">
                    {step.number}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="absolute left-[60%] top-8 hidden h-px w-[80%] border-t border-dashed border-border md:block" />
                  )}
                  <h3 className="mb-2 text-lg font-bold text-foreground">{step.title}</h3>
                  <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-6 py-20 sm:px-12">
          <div className="mb-14 text-center animate-slide-up">
            <h2 className="mb-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Sin costos ocultos
            </h2>
            <p className="mx-auto max-w-lg text-muted-foreground">
              Usa Hermes sin pagar nada. Solo invierte en facturaci&oacute;n electr&oacute;nica
              cuando la necesites.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="animate-slide-up rounded-xl border-2 border-primary/30 bg-card p-8 shadow-lg shadow-primary/5">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                Siempre gratis
              </div>
              <h3 className="mb-1 mt-4 text-xl font-bold text-foreground">Core del negocio</h3>
              <div className="mb-6 mt-2">
                <span className="text-4xl font-black text-foreground">$0</span>
                <span className="ml-1 text-sm text-muted-foreground">/mes</span>
              </div>
              <ul className="space-y-3">
                {[
                  "Punto de venta completo",
                  "Gestión de inventario",
                  "Reportes y estadísticas",
                  "Clientes y usuarios",
                  "Cajas multi-sesión",
                  "Soporte offline",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="animate-slide-up rounded-xl border border-border bg-card p-8" style={{ animationDelay: "0.15s" }}>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                Pago por uso
              </div>
              <h3 className="mb-1 mt-4 text-xl font-bold text-foreground">Facturaci&oacute;n Electr&oacute;nica</h3>
              <div className="mb-6 mt-2">
                <span className="text-4xl font-black text-foreground">Cr&eacute;ditos</span>
              </div>
              <ul className="space-y-3">
                {[
                  "Firma digital incluida",
                  "Envío automático a la DIAN",
                  "Resolución de facturación",
                  "Soporte técnico prioritario",
                  "Sin mensualidad obligatoria",
                  "Compra créditos solo cuando necesites",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Sin contratos, sin permanencia. Cancela cuando quieras.
          </p>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:px-12">
            <div className="animate-slide-up">
              <h2 className="mb-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Listo para hacer tu negocio{" "}
                <span className="bg-gradient-to-r from-[#004F6E] via-[#1A7A9E] to-[#4A9EBD] bg-clip-text text-transparent">
                  volar
                </span>
                ?
              </h2>
              <p className="mx-auto mb-10 max-w-md text-muted-foreground">
                &Uacute;nete a los negocios que ya conf&iacute;an en Hermes para gestionar sus
                ventas, inventario y facturaci&oacute;n electr&oacute;nica.
              </p>
              <Link
                href="https://wa.me/573175227672?text=Hola,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20Hermes"
                target="_blank"
                className="group relative inline-flex items-center gap-2 rounded-xl bg-primary px-10 py-4 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:brightness-125"
              >
                Comenzar ahora
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:px-12">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-1">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-[8px] font-black text-primary-foreground">
                H
              </div>
              <span className="text-xs font-bold tracking-tight text-foreground/70">ermes</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <Link href="#features" className="transition-colors hover:text-foreground">
                Funcionalidades
              </Link>
              <Link href="#pricing" className="transition-colors hover:text-foreground">
                Precios
              </Link>
              <Link href="/login" className="transition-colors hover:text-foreground">
                Iniciar sesi&oacute;n
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            Hermes &mdash; Hecho en Colombia &middot; 2026
          </div>
        </div>
      </footer>
    </div>
  )
}
