import { LoginForm } from "@/components/auth/login-form"
import { APP_NAME } from "@/lib/constants"
import { Store } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-pos-brand via-[#00415B] to-[#002D3F] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,oklch(1_0_0/0.12),transparent_60%),radial-gradient(ellipse_at_70%_80%,oklch(0.75_0.12_75/0.08),transparent_50%)]" />
        <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="relative text-center text-primary-foreground space-y-8 p-12 max-w-md">
          <div className="mx-auto flex size-24 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
            <Store className="size-12" />
          </div>
          <div className="space-y-3">
            <h1 className="font-sans text-5xl font-bold tracking-tight">{APP_NAME}</h1>
            <p className="text-lg leading-relaxed text-white/80 font-[family-name:var(--font-sans)]">
              Sistema POS y gestión de inventarios para tu negocio
            </p>
          </div>
          <div className="flex justify-center gap-6 pt-2">
            {["Ventas", "Inventario", "Reportes"].map((item) => (
              <span
                key={item}
                className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/70 ring-1 ring-white/15"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background">
        <LoginForm />
      </div>
    </div>
  )
}
