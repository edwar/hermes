import { formatCOP } from "@/lib/utils"
import { STORE_NAME, STORE_ADDRESS, STORE_PHONE, STORE_NIT } from "@/lib/constants"

interface ReceiptData {
  id: string
  total: number
  subtotal: number
  tax: number
  discount: number
  paymentMethod: string
  createdAt: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
  customerName?: string
  storeSettings?: {
    storeName: string
    nit: string
    address: string
    phone: string
    email: string
    receiptFooter: string
    taxRate: number
    currency: string
  }
}

const ESC = 0x1b
const GS = 0x1d

function write(data: number[]): Uint8Array {
  return new Uint8Array(data)
}

function init(): number[] {
  return [ESC, 0x40]
}

function align(n: number): number[] {
  return [ESC, 0x61, n]
}

const ALIGN_LEFT = 0
const ALIGN_CENTER = 1
const ALIGN_RIGHT = 2

function text(str: string): number[] {
  const bytes: number[] = []
  for (const ch of str) {
    const code = ch.charCodeAt(0)
    if (code < 128) {
      bytes.push(code)
    } else {
      bytes.push(0x20)
    }
  }
  return bytes
}

function line(str: string): number[] {
  return [...text(str), 0x0a]
}

function bold(on: boolean): number[] {
  return [ESC, 0x45, on ? 1 : 0]
}

function size(w: number, h: number): number[] {
  return [GS, 0x21, (w - 1) | ((h - 1) << 4)]
}

function feed(n: number): number[] {
  return [ESC, 0x64, n]
}

function cut(): number[] {
  return [GS, 0x56, 0]
}

function separator(): number[] {
  return line("─".repeat(32))
}

export function buildEscposReceipt(data: ReceiptData): Uint8Array {
  const methodLabels: Record<string, string> = {
    CASH: "Efectivo",
    CARD: "Tarjeta",
    TRANSFER: "Transferencia",
    CREDIT: "Crédito",
  }

  const s = data.storeSettings
  const storeName = s?.storeName ?? STORE_NAME
  const storeNit  = s?.nit ?? STORE_NIT
  const storeAddr = s?.address ?? STORE_ADDRESS
  const storePh   = s?.phone ?? STORE_PHONE
  const footer    = s?.receiptFooter ?? "¡Gracias por su compra!"
  const appName   = storeName

  const bytes: number[] = [
    ...init(),
    ...align(ALIGN_CENTER),
    ...size(2, 2),
    ...line(storeName),
    ...size(1, 1),
  ]

  if (storeNit) bytes.push(...line(storeNit))
  if (storeAddr) bytes.push(...line(storeAddr))
  if (storePh) bytes.push(...line(storePh))

  bytes.push(
    ...line(""),
    ...separator(),
    ...line(""),
    ...line(appName),
    ...line(formatDate(data.createdAt)),
    ...line(`#${data.id.slice(-8).toUpperCase()}`),
    ...line(""),
    ...separator(),
    ...line(""),
  )

  if (data.customerName) {
    bytes.push(...line(`Cliente: ${data.customerName}`), ...line(""))
  }

  bytes.push(
    ...bold(true),
    ...line(`${"Item".padEnd(16)} ${"Cant".padStart(4)} ${"Total".padStart(8)}`),
    ...bold(false),
  )

  for (const item of data.items) {
    const name = item.name.slice(0, 16).padEnd(16)
    const qty = String(item.quantity).padStart(4)
    const total = formatCOP(Number(item.subtotal)).padStart(8)
    bytes.push(...line(`${name} ${qty} ${total}`))
  }

  bytes.push(
    ...line(""),
    ...separator(),
    ...line(""),
    ...line(`Subtotal${"".padStart(16)}${formatCOP(Number(data.subtotal)).padStart(12)}`),
    ...line(`IVA 19%${"".padStart(15)}${formatCOP(Number(data.tax)).padStart(12)}`),
  )

  if (Number(data.discount) > 0) {
    bytes.push(...line(`Descuento${"".padStart(14)}-${formatCOP(Number(data.discount)).padStart(11)}`))
  }

  bytes.push(
    ...bold(true),
    ...size(2, 2),
    ...line(`TOTAL${"".padStart(12)}${formatCOP(Number(data.total)).padStart(12)}`),
    ...size(1, 1),
    ...bold(false),
    ...line(""),
    ...line(`Método: ${methodLabels[data.paymentMethod] ?? data.paymentMethod}`),
    ...line(""),
    ...separator(),
    ...line(""),
    ...align(ALIGN_CENTER),
    ...line(footer),
    ...line(""),
    ...feed(3),
    ...cut(),
  )

  return new Uint8Array(bytes)
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}
