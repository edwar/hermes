"use client"

import { useEffect, useRef, useCallback } from "react"
import { sileo } from "sileo"

interface BarcodeScannerProps {
  onProductFound: (product: {
    id: string
    name: string
    barcode?: string | null
    price: number
    stock: number
  }) => void
}

const SCAN_THRESHOLD_MS = 50

export function BarcodeScanner({ onProductFound }: BarcodeScannerProps) {
  const bufferRef = useRef("")
  const lastTimeRef = useRef(0)
  const processingRef = useRef(false)

  const lookup = useCallback(async (code: string) => {
    if (!code.trim() || processingRef.current) return
    processingRef.current = true
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(code)}&pageSize=50`)
      const data = await res.json()
      const product = data.products?.find(
        (p: any) => p.barcode?.toLowerCase() === code.toLowerCase()
      )
      if (product) {
        onProductFound(product)
        sileo.success({ title: `${product.name} agregado`, duration: 1500 })
      }
    } catch {
      // Silenciar errores de búsqueda
    } finally {
      processingRef.current = false
    }
  }, [onProductFound])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now()
      const elapsed = now - lastTimeRef.current
      lastTimeRef.current = now

      if (e.key === "Enter") {
        const code = bufferRef.current.trim()
        bufferRef.current = ""
        if (code) lookup(code)
        return
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (!e.key || e.key.length !== 1) return
      if (elapsed < SCAN_THRESHOLD_MS) {
        bufferRef.current += e.key
      } else {
        bufferRef.current = e.key
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lookup])

  return null
}
