import { LoginForm } from "@/components/auth/login-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { ThemeToggle } from "@/components/shared/theme-toggle"

export default function LoginPage() {
  return (
    <AuthShell tagline="Cada venta, cada peso y cada factura bajo control." corner={<ThemeToggle />}>
      <LoginForm />
    </AuthShell>
  )
}
