import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { APP_NAME } from "@/lib/constants"
import { Home, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Error 404</p>
        <h1 className="mt-3 font-sans text-4xl font-bold tracking-tight">Página no encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida. Verifica la URL o vuelve al inicio de {APP_NAME}.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            <Home className="mr-2 size-4" />
            Ir al inicio
          </Link>
          <Link href="/pos" className={buttonVariants({ variant: "outline" })}>
            <Search className="mr-2 size-4" />
            Punto de venta
          </Link>
        </div>
      </div>
    </div>
  )
}
