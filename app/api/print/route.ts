import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const data = await req.json()

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ThermalPrinter: TP, PrinterTypes } = require("node-thermal-printer")
    const printer = new TP({
      type: PrinterTypes.EPSON,
      interface: process.env.PRINTER_INTERFACE ?? "USB",
      options: {
        timeout: 5000,
      },
    })

    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      return NextResponse.json({ error: "Impresora no conectada al servidor" }, { status: 500 })
    }

    printer.alignCenter()
    printer.setTextSize(2, 2)
    printer.println(process.env.STORE_NAME ?? "Mi Tienda")
    printer.setTextSize(1, 1)
    printer.println(process.env.STORE_NIT ?? "")
    printer.println(process.env.STORE_ADDRESS ?? "")
    printer.println(process.env.STORE_PHONE ?? "")
    printer.newLine()
    printer.drawLine()
    printer.newLine()
    printer.println(data.id ? `#${data.id.slice(-8).toUpperCase()}` : "")
    printer.newLine()
    printer.drawLine()

    if (data.items) {
      for (const item of data.items) {
        printer.println(`${item.name ?? "Producto"} x${item.quantity}`)
      }
    }

    printer.newLine()
    printer.drawLine()
    printer.bold(true)
    printer.println(`TOTAL: $${Number(data.total ?? 0).toLocaleString("es-CO")}`)
    printer.bold(false)
    printer.newLine()
    printer.cut()

    await printer.execute()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Print error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al imprimir" },
      { status: 500 }
    )
  }
}
