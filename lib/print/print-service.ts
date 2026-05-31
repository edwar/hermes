import { buildEscposReceipt } from "./escpos"
import { formatCOP as formatCopUtil } from "@/lib/utils"
import * as constants from "@/lib/constants"

export type PrintMethod = "browser" | "webusb" | "qztray" | "server"

export interface PrintData {
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

export function getPrintMethod(): PrintMethod {
  if (typeof window === "undefined") return "browser"
  return (localStorage.getItem("print-method") as PrintMethod) ?? "browser"
}

export function setPrintMethod(method: PrintMethod) {
  localStorage.setItem("print-method", method)
}

export function getQzTrayConfig() {
  try {
    const raw = localStorage.getItem("qz-tray-config")
    return raw ? JSON.parse(raw) : { host: "localhost", port: 12521 }
  } catch {
    return { host: "localhost", port: 12521 }
  }
}

export function setQzTrayConfig(config: { host: string; port: number }) {
  localStorage.setItem("qz-tray-config", JSON.stringify(config))
}

export interface PrinterInfo {
  vendorId: number
  productId: number
  productName: string
}

export async function requestWebUsbPrinter(): Promise<PrinterInfo> {
  const device = await navigator.usb.requestDevice({
    filters: [{ classCode: 7 }],
  })
  return {
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName ?? "Impresora Térmica",
  }
}

export function getWebUsbPrinter(): PrinterInfo | null {
  try {
    const raw = localStorage.getItem("webusb-printer")
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setWebUsbPrinter(info: PrinterInfo | null) {
  if (info) {
    localStorage.setItem("webusb-printer", JSON.stringify(info))
  } else {
    localStorage.removeItem("webusb-printer")
  }
}

async function printWebUsb(data: PrintData): Promise<void> {
  const printerInfo = getWebUsbPrinter()
  if (!printerInfo) throw new Error("No hay impresora USB configurada")

  const devices = await navigator.usb.getDevices()
  const device = devices.find(
    (d) => d.vendorId === printerInfo.vendorId && d.productId === printerInfo.productId
  )
  if (!device) throw new Error("Impresora no encontrada. Reconecta el dispositivo.")

  await device.open()
  await device.selectConfiguration(1)
  await device.claimInterface(0)

  const cfg = device.configuration
  if (!cfg) throw new Error("No se encontró configuración del dispositivo")
  const endpoint = cfg.interfaces[0].alternate.endpoints.find(
    (ep: USBCEndpoint) => ep.direction === "out"
  )
  if (!endpoint) throw new Error("No se encontró endpoint de salida")

  const bytes = buildEscposReceipt(data)
  await device.transferOut(endpoint.endpointNumber, bytes)
  await device.close()
}

async function printQzTray(data: PrintData): Promise<void> {
  const config = getQzTrayConfig()
  const bytes = buildEscposReceipt(data)
  const base64 = btoa(String.fromCharCode(...bytes))

  const res = await fetch(`http://${config.host}:${config.port}/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      printer: "default",
      data: base64,
      encoding: "base64",
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`QZ Tray error: ${text}`)
  }
}

async function printServer(data: PrintData): Promise<void> {
  const res = await fetch("/api/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "Error al imprimir en servidor")
  }
}

function printBrowser(data: PrintData): void {
  const receiptHtml = buildBrowserReceiptHtml(data)
  const printWindow = window.open("", "_blank")
  if (!printWindow) throw new Error("No se pudo abrir la ventana de impresión")

  printWindow.document.write(`
    <html><head>
      <title>Ticket #${data.id.slice(-8).toUpperCase()}</title>
      <style>
        @page { size: 80mm; margin: 0; }
        body { margin: 0; padding: 5mm; font-size: 12px; font-family: 'Courier New', monospace; color: black; background: white; width: 80mm; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .border-t { border-top: 1px dashed #000; }
        .text-center { text-align: center; }
        .font-mono { font-family: 'Courier New', monospace; }
      </style>
    </head><body>
      ${receiptHtml}
      <script>window.print(); window.close();<\/script>
    </body></html>
  `)
  printWindow.document.close()
}

export async function printReceipt(data: PrintData, method?: PrintMethod): Promise<void> {
  const m = method ?? getPrintMethod()

  switch (m) {
    case "browser":
      printBrowser(data)
      break
    case "webusb":
      await printWebUsb(data)
      break
    case "qztray":
      await printQzTray(data)
      break
    case "server":
      await printServer(data)
      break
  }
}

export async function testPrint(method: PrintMethod): Promise<void> {
  const testData: PrintData = {
    id: "TEST",
    total: 0,
    subtotal: 0,
    tax: 0,
    discount: 0,
    paymentMethod: "CASH",
    createdAt: new Date().toISOString(),
    items: [{ name: "PRUEBA DE IMPRESIÓN", quantity: 1, unitPrice: 0, subtotal: 0 }],
  }

  await printReceipt(testData, method)
}

function buildBrowserReceiptHtml(data: PrintData): string {
  const methodLabels: Record<string, string> = {
    CASH: "Efectivo",
    CARD: "Tarjeta",
    TRANSFER: "Transferencia",
    CREDIT: "Crédito",
  }

  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td class="text-right font-mono">${item.quantity}</td>
      <td class="text-right font-mono">${formatCopUtil(Number(item.unitPrice))}</td>
      <td class="text-right font-mono">${formatCopUtil(Number(item.subtotal))}</td>
    </tr>`
    )
    .join("")

  const discountHtml =
    Number(data.discount) > 0
      ? `<tr><td colspan="3">Descuento</td><td class="text-right font-mono">-${formatCopUtil(Number(data.discount))}</td></tr>`
      : ""

  const s = data.storeSettings
  const storeName = s?.storeName ?? constants.STORE_NAME
  const storeNit  = s?.nit ?? constants.STORE_NIT
  const storeAddr = s?.address ?? constants.STORE_ADDRESS
  const storePh   = s?.phone ?? constants.STORE_PHONE
  const storeEmail = s?.email ?? ""
  const footer    = s?.receiptFooter ?? "¡Gracias por su compra!"
  const taxPct    = s ? Number(s.taxRate) * 100 : 19

  return `
    <div class="text-center">
      <p class="font-bold" style="font-size:14px">${escapeHtml(storeName)}</p>
      ${storeNit ? `<p>${escapeHtml(storeNit)}</p>` : ""}
      ${storeAddr ? `<p>${escapeHtml(storeAddr)}</p>` : ""}
      ${storePh ? `<p>${escapeHtml(storePh)}</p>` : ""}
      ${storeEmail ? `<p>${escapeHtml(storeEmail)}</p>` : ""}
    </div>
    <div class="border-t mt-2 mb-2"></div>
    <div class="text-center">
      <p>${escapeHtml(storeName)}</p>
      <p>${formatDate(data.createdAt)}</p>
      <p class="font-mono">#${data.id.slice(-8).toUpperCase()}</p>
    </div>
    <div class="border-t mt-2 mb-2"></div>
    ${data.customerName ? `<p>Cliente: ${escapeHtml(data.customerName)}</p>` : ""}
    <table>
      <thead>
        <tr class="font-bold">
          <td class="pb-1">Item</td>
          <td class="pb-1 text-right">Cant</td>
          <td class="pb-1 text-right">Precio</td>
          <td class="pb-1 text-right">Total</td>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <div class="border-t mt-2 mb-2"></div>
    <table>
      <tr><td>Subtotal</td><td class="text-right font-mono">${formatCopUtil(Number(data.subtotal))}</td></tr>
      <tr><td>IVA ${taxPct.toFixed(0)}%</td><td class="text-right font-mono">${formatCopUtil(Number(data.tax))}</td></tr>
      ${discountHtml}
      <tr class="font-bold"><td>TOTAL</td><td class="text-right font-mono">${formatCopUtil(Number(data.total))}</td></tr>
    </table>
    <div class="border-t mt-2 mb-2"></div>
    <div class="text-center">
      <p>Método: ${methodLabels[data.paymentMethod] ?? data.paymentMethod}</p>
    </div>
    <div class="text-center mt-2" style="font-size:10px;color:gray">
      <p>${escapeHtml(footer)}</p>
    </div>
  `
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("es-CO", {
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

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
