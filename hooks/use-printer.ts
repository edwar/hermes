"use client"

import { useCallback, useState } from "react"
import { printReceipt, getPrintMethod } from "@/lib/print/print-service"
import type { PrintData, PrintMethod } from "@/lib/print/print-service"
import { sileo } from "sileo"

export function usePrinter() {
  const [isPrinting, setIsPrinting] = useState(false)

  const print = useCallback(async (data: PrintData, method?: PrintMethod) => {
    setIsPrinting(true)
    try {
      await printReceipt(data, method)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al imprimir"
      sileo.error({ title: msg })
    } finally {
      setIsPrinting(false)
    }
  }, [])

  return { print, isPrinting, currentMethod: getPrintMethod() }
}
