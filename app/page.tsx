import Link from "next/link"

const GRADIENT = "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent"

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0B1120] text-white selection:bg-amber-500/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,150,136,0.06),transparent_50%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <style>{`
        @keyframes float { 0%,100% { transform: translate(0,0) rotate(0deg); } 25% { transform: translate(30px,-30px) rotate(3deg); } 50% { transform: translate(-20px,-40px) rotate(-2deg); } 75% { transform: translate(40px,20px) rotate(4deg); } }
        @keyframes slideUp { from { opacity:0; transform: translateY(30px); } to { opacity:1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.8s ease-out forwards; }
      `}</style>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-[10px] font-black text-white shadow-lg shadow-amber-500/20">H</div>
          <span className="text-sm font-bold tracking-tight text-white/90">ermes</span>
        </div>
        <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white">Iniciar sesi&oacute;n</Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-200px)] max-w-6xl flex-col items-center justify-center px-6 pb-20 pt-10 text-center sm:px-12">
        <div className="animate-slide-up max-w-3xl">
          <div className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-xs font-medium text-amber-400/80">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400/40" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
            </span>
            Sistema de facturaci&oacute;n electr&oacute;nica
          </div>

          <h1 className="mb-6 text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Tu negocio{" "}
            <span className={GRADIENT}>vuela</span>
            <br />
            con Hermes
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg">
            Punto de venta, facturaci&oacute;n electr&oacute;nica, inventario y m&aacute;s. Todo en un solo lugar, sin complicaciones.
          </p>

          <Link href="/login" className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:brightness-110">
            Comenzar
            <svg className="size-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        <div className="mt-20 grid w-full max-w-3xl grid-cols-2 gap-6 border-t border-white/5 pt-10 text-center sm:grid-cols-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          {[
            { value: "Gratis", label: "Core del negocio" },
            { value: "100%", label: "Online / Offline" },
            { value: "DIAN", label: "Facturaci&oacute;n electr&oacute;nica" },
            { value: "1 clic", label: "Puesta en marcha" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-lg font-bold text-white/90">{item.value}</p>
              <p className="mt-0.5 text-xs text-white/40">{item.label}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-6 py-6 text-center text-xs text-white/30 sm:px-12">
        Hermes POS &mdash; Hecho en Colombia
      </footer>
    </div>
  )
}
