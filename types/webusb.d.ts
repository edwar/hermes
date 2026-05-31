interface Navigator {
  usb: USB
}

interface USB {
  getDevices(): Promise<USBDevice[]>
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>
}

interface USBDeviceRequestOptions {
  filters?: USBDeviceFilter[]
  exclusionFilters?: USBDeviceFilter[]
}

interface USBDeviceFilter {
  vendorId?: number
  productId?: number
  classCode?: number
  subclassCode?: number
  protocolCode?: number
  serialNumber?: string
}

interface USBDevice {
  vendorId: number
  productId: number
  productName?: string
  configuration: USBConfiguration | null
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  releaseInterface(interfaceNumber: number): Promise<void>
  selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>
  controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>
  controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult>
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>
  transferOut(endpointNumber: number, data: BufferSource | Uint8Array): Promise<USBOutTransferResult>
  clearHalt(direction: "in" | "out", endpointNumber: number): Promise<void>
  reset(): Promise<void>
  isOpen: boolean
}

interface USBConfiguration {
  configurationValue: number
  configurationName?: string
  interfaces: USBInterface[]
}

interface USBInterface {
  interfaceNumber: number
  alternate: USBAlternateInterface
  alternates: USBAlternateInterface[]
  claimed: boolean
}

interface USBAlternateInterface {
  alternateSetting: number
  interfaceClass: number
  interfaceSubclass: number
  interfaceProtocol: number
  interfaceName?: string
  endpoints: USBCEndpoint[]
}

interface USBCEndpoint {
  endpointNumber: number
  direction: "in" | "out"
  type: "bulk" | "interrupt" | "isochronous"
  packetSize: number
}

interface USBControlTransferParameters {
  requestType: "standard" | "class" | "vendor"
  recipient: "device" | "interface" | "endpoint" | "other"
  request: number
  value: number
  index: number
}

interface USBInTransferResult {
  data?: DataView
  status: "ok" | "stall" | "babble"
}

interface USBOutTransferResult {
  bytesWritten: number
  status: "ok" | "stall"
}
