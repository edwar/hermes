"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { sileo } from "sileo"
import { useOfflineCache } from "@/hooks/use-offline-cache"

interface BarcodeScannerProps {
  onProductFound: (product: {
    id: string
    name: string
    barcode?: string | null
    price: number
    stock: number
    sellByWeight?: boolean
    weightUnit?: string
  }) => void
}

const SCAN_THRESHOLD_MS = 50

export function BarcodeScanner({ onProductFound }: BarcodeScannerProps) {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId
  const { getCachedProductByBarcode, cacheProducts } = useOfflineCache()
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
        if (companyId) cacheProducts([product], companyId)
        onProductFound(product)
        sileo.success({ title: `${product.name} agregado`, duration: 1500 })
        return
      }
    } catch {
      // Fallback a cache local
    }

    // Fallback: buscar en Dexie
    if (companyId) {
      const cached = await getCachedProductByBarcode(code, companyId)
      if (cached) {
        onProductFound({
          id: cached.id,
          name: cached.name,
          barcode: cached.barcode,
          price: cached.price,
          stock: cached.stock,
        })
        sileo.success({ title: `${cached.name} agregado (offline)`, duration: 1500 })
      }
    }
  }, [onProductFound, companyId, getCachedProductByBarcode, cacheProducts])

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
