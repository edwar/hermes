import { Printer, Usb, Globe, Server, Monitor } from "lucide-react"

const methods = [
  {
    id: "browser",
    icon: Monitor,
    title: "Navegador (por defecto)",
    desc: "Abre el diálogo de impresión del navegador para seleccionar la impresora manualmente.",
    steps: [
      "No requiere configuración adicional.",
      "Al hacer clic en \"Imprimir ticket\" se abrirá el diálogo del navegador.",
      "Selecciona tu impresora térmica (80mm) en las opciones de impresión.",
      "Configura márgenes en \"Ninguno\" y escala en \"100%\" para mejor resultado.",
    ],
  },
  {
    id: "webusb",
    icon: Usb,
    title: "WebUSB (Conexión directa USB)",
    desc: "Conecta la impresora térmica directamente al navegador sin instalar nada. Solo compatible con Chrome/Edge.",
    steps: [
      "Conecta tu impresora térmica por USB a la computadora.",
      "Ve al POS y haz clic en \"Impresora\" > selecciona \"WebUSB\".",
      "Haz clic en \"Conectar impresora USB\" y selecciona tu impresora en el diálogo del navegador.",
      "Una vez conectada, las impresiones se enviarán directamente sin diálogos adicionales.",
      "La configuración se guarda en el navegador (localStorage).",
    ],
    note: "Solo funciona con Chrome, Edge y Opera. HTTPS requerido en producción.",
  },
  {
    id: "qztray",
    icon: Globe,
    title: "QZ Tray (Agente local)",
    desc: "Un pequeño programa instalado en la PC que recibe las órdenes de impresión y las envía a la impresora.",
    steps: [
      "Descarga e instala QZ Tray desde qztray.com.",
      "Abre QZ Tray (se ejecuta en segundo plano en la bandeja del sistema).",
      "Ve al POS > \"Impresora\" > selecciona \"QZ Tray\".",
      "Configura el host (generalmente localhost) y puerto (12521 por defecto).",
      "Haz clic en \"Imprimir prueba\" para verificar la conexión.",
    ],
    note: "Requiere que QZ Tray esté ejecutándose en la computadora. Funciona en todos los navegadores.",
  },
  {
    id: "server",
    icon: Server,
    title: "Servidor (Impresora conectada al servidor)",
    desc: "La impresora térmica se conecta directamente al servidor donde está alojada la aplicación.",
    steps: [
      "Conecta la impresora térmica al servidor (USB o red).",
      "Configura la variable de entorno PRINTER_INTERFACE en el servidor.",
      "Ejemplo: PRINTER_INTERFACE=USB_PRINTER o PRINTER_INTERFACE=192.168.1.100",
      "Ve al POS > \"Impresora\" > selecciona \"Servidor\".",
      "Haz clic en \"Imprimir prueba\" para verificar.",
    ],
    note: "Todas las computadoras que usen el sistema compartirán la misma impresora del servidor.",
  },
]

export default function PrintGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-[oklch(0.96_0.008_60)]">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Printer className="size-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Configuración de impresión térmica</h1>
          <p className="mt-2 text-muted-foreground">
            Elige el método que mejor se adapte a tu configuración
          </p>
        </div>

        <div className="space-y-6">
          {methods.map((method) => {
            const Icon = method.icon
            return (
              <div
                key={method.id}
                id={method.id}
                className="rounded-xl border bg-card p-6 shadow-sm"
              >
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold">{method.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{method.desc}</p>
                  </div>
                </div>

                <ol className="ml-4 space-y-2">
                  {method.steps.map((step, i) => (
                    <li key={i} className="text-sm text-muted-foreground list-decimal">
                      {step}
                    </li>
                  ))}
                </ol>

                {method.note && (
                  <div className="mt-4 rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm text-warning">
                    <span className="font-medium">Nota:</span> {method.note}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-10 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Solución de problemas</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg border p-3">
              <p className="font-medium">La impresora no aparece en WebUSB</p>
              <p className="mt-1 text-muted-foreground">
                Asegúrate de usar Chrome o Edge, que la impresora esté conectada por USB y
                que el sitio use HTTPS (o localhost en desarrollo).
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">QZ Tray no responde</p>
              <p className="mt-1 text-muted-foreground">
                Verifica que QZ Tray esté instalado y ejecutándose. Revisa el puerto (12521
                por defecto). Si usas HTTPS, QZ Tray requiere configuración adicional con
                certificados.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">La impresión sale cortada o mal alineada</p>
              <p className="mt-1 text-muted-foreground">
                En el método Navegador, configura márgenes en "Ninguno" y escala en "100%".
                Para métodos silenciosos, verifica que la impresora soporte ESC/POS.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Una vez configurado, ve al POS y haz clic en "Impresora" para seleccionar el método.</p>
        </div>
      </div>
    </div>
  )
}
