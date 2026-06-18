"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface ScaleInfo {
  usbVendorId: number
  usbProductId: number
}

const SCALE_STORAGE_KEY = "hermes-scale-info"

function getStoredScale(): ScaleInfo | null {
  try {
    const raw = localStorage.getItem(SCALE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function storeScale(info: ScaleInfo | null) {
  if (info) {
    localStorage.setItem(SCALE_STORAGE_KEY, JSON.stringify(info))
  } else {
    localStorage.removeItem(SCALE_STORAGE_KEY)
  }
}

export interface UseScaleReturn {
  connected: boolean
  weight: number | null
  connecting: boolean
  error: string | null
  requestScale: () => Promise<void>
  reconnectScale: () => Promise<void>
  disconnectScale: () => void
}

export function useScale(): UseScaleReturn {
  const [connected, setConnected] = useState(false)
  const [weight, setWeight] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const portRef = useRef<SerialPort | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null)
  const readingRef = useRef(false)

  const disconnect = useCallback(() => {
    readingRef.current = false
    readerRef.current?.cancel().catch(() => {})
    readerRef.current = null
    portRef.current?.close().catch(() => {})
    portRef.current = null
    setConnected(false)
    setWeight(null)
    setError(null)
  }, [])

  const startReading = useCallback(async (port: SerialPort) => {
    await port.open({ baudRate: 9600 })
    portRef.current = port
    readingRef.current = true

    const textDecoder = new TextDecoder()
    let buffer = ""

    while (readingRef.current) {
      try {
        readerRef.current = port.readable?.getReader() ?? null
        if (!readerRef.current) break

        while (true) {
          const { value, done } = await readerRef.current.read()
          if (done) break

          buffer += textDecoder.decode(value, { stream: true })

          const lines = buffer.split("\r\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.trim()
            const match = trimmed.match(/[-+]?\d+\.?\d*/)
            if (match) {
              const parsed = parseFloat(match[0])
              if (!isNaN(parsed) && parsed >= 0) {
                setWeight(parsed)
              }
            }
          }
        }
      } catch {
        if (!readingRef.current) return
      }
    }
  }, [])

  const requestScale = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.serial) {
      setError("Web Serial no está disponible. Usa Chrome o Edge.")
      return
    }

    setConnecting(true)
    setError(null)

    try {
      const serialPort = await navigator.serial.requestPort()
      const info = serialPort.getInfo()
      storeScale({
        usbVendorId: info.usbVendorId ?? 0,
        usbProductId: info.usbProductId ?? 0,
      })
      setConnected(true)
      startReading(serialPort)
    } catch (err: any) {
      if (err.name === "NotFoundError") return
      setError(err.message || "Error al conectar la báscula")
    } finally {
      setConnecting(false)
    }
  }, [startReading])

  const reconnectScale = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.serial) {
      setError("Web Serial no está disponible")
      return
    }

    const stored = getStoredScale()
    if (!stored) {
      await requestScale()
      return
    }

    setConnecting(true)
    setError(null)

    try {
      const ports = await navigator.serial.getPorts()
      const port = ports.find((p) => {
        const info = p.getInfo()
        return info.usbVendorId === stored.usbVendorId && info.usbProductId === stored.usbProductId
      })

      if (!port) {
        setError("Báscula no encontrada. Reconéctala o vuelve a configurarla.")
        setConnecting(false)
        return
      }

      setConnected(true)
      startReading(port)
    } catch (err: any) {
      setError(err.message || "Error al reconectar la báscula")
    } finally {
      setConnecting(false)
    }
  }, [requestScale, startReading])

  useEffect(() => {
    return () => {
      readingRef.current = false
      readerRef.current?.cancel().catch(() => {})
      portRef.current?.close().catch(() => {})
    }
  }, [])

  return {
    connected,
    weight,
    connecting,
    error,
    requestScale,
    reconnectScale,
    disconnectScale: disconnect,
  }
}
