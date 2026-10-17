import { RegisterForm } from "@/components/auth/register-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { Suspense } from "react"

function RegisterFormSkeleton() {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 w-full animate-pulse rounded-md bg-elevated" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <AuthShell tagline="Abre tu mostrador en minutos y vende desde hoy." corner={<ThemeToggle />}>
      <Suspense fallback={<RegisterFormSkeleton />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  )
}
