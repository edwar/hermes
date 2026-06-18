interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null

  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  getInfo(): SerialPortInfo
}

interface Navigator {
  readonly serial: {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
    getPorts(): Promise<SerialPort[]>
  }
}

interface SerialPortRequestOptions {
  filters?: Array<{ usbVendorId?: number; usbProductId?: number }>
}
