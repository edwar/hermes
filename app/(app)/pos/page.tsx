"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { ProductGrid } from "@/components/pos/product-grid"
import { BarcodeScanner } from "@/components/pos/barcode-scanner"
import { Cart } from "@/components/pos/cart"
import { PaymentModal } from "@/components/pos/payment-modal"
import { ReturnDialog } from "@/components/pos/return-dialog"
import { SessionBlockerOverlay } from "@/components/pos/session-blocker-overlay"
import { ActiveSessionBadge } from "@/components/pos/active-session-badge"
import { CloseSessionDialog } from "@/components/cajas/close-session-dialog"
import { CashMovementForm } from "@/components/cajas/cash-movement-form"
import { CustomerForm } from "@/components/inventory/customer-form"
import { useCart } from "@/features/pos/hooks/use-cart"
import { useCheckout } from "@/features/pos/hooks/use-checkout"
import { PrinterSettings } from "@/components/settings/printer-settings"
import { useSessionHeartbeat } from "@/hooks/use-session-heartbeat"
import { usePresenceMonitor } from "@/hooks/use-presence-monitor"
import { RotateCcw, Printer, Loader2, ArrowUpDown, AlertTriangle } from "lucide-react"
import type { CartItem } from "@/features/pos/types"

async function fetchActiveSession() {
  const res = await fetch("/api/cash-sessions/active")
  if (!res.ok) {
    if (res.status === 401) return null
    throw new Error("Error al cargar sesión activa")
  }
  return res.json()
}

export default function POSPage() {
  const cart = useCart()
  const checkout = useCheckout()
  const searchParams = useSearchParams()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [saleResult, setSaleResult] = useState<any>(null)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnSaleId, setReturnSaleId] = useState<string | undefined>()
  const [printerOpen, setPrinterOpen] = useState(false)
  const [closeSessionOpen, setCloseSessionOpen] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const [customerFormOpen, setCustomerFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [pendingCustomerCedula, setPendingCustomerCedula] = useState<string | null>(null)
  const [justEditedCustomer, setJustEditedCustomer] = useState<any>(null)

  const { data: activeSession, isLoading: sessionLoading } = useQuery({
    queryKey: ["active-session", sessionKey],
    queryFn: fetchActiveSession,
  })

  useSessionHeartbeat(activeSession?.id ?? null)

  const { hasConflict } = usePresenceMonitor(
    activeSession?.user?.id ?? null,
    activeSession?.id ?? null
  )

  useEffect(() => {
    const returnId = searchParams.get("return")
    if (returnId) {
      setReturnSaleId(returnId)
      setReturnOpen(true)
    }
  }, [searchParams])

  const handleAddProduct = useCallback(
    (product: { id: string; name: string; barcode?: string | null; price: number; stock: number }) => {
      cart.addItem(product)
    },
    [cart]
  )

  const handleCheckout = useCallback(() => {
    setPaymentOpen(true)
  }, [])

  const handleConfirmPayment = useCallback(
    async (data: {
      items: CartItem[]
      subtotal: number
      tax: number
      total: number
      paymentMethod: string
      customerId?: string
      customerName?: string
      requestElectronicInvoice?: boolean
    }) => {
      const result = await checkout.mutateAsync({
        items: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.subtotal,
        })),
        subtotal: data.subtotal,
        tax: data.tax,
        discount: 0,
        total: data.total,
        paymentMethod: data.paymentMethod as "CASH" | "CARD" | "TRANSFER" | "CREDIT",
        sessionId: activeSession?.id,
        customerId: data.customerId,
        requestElectronicInvoice: data.requestElectronicInvoice,
      })
      setSaleResult(result)
    },
    [checkout, activeSession]
  )

  const handleNewSale = useCallback(() => {
    cart.clearCart()
    setSaleResult(null)
    setPaymentOpen(false)
  }, [cart])

  function handleSessionOpened() {
    setSessionKey((k) => k + 1)
  }

  function handleSessionConflict(info: { sessionId: string; activeUser?: string; activeDevice?: string }) {
    // Force refresh to see the conflict state
    setSessionKey((k) => k + 1)
  }

  function handleRequestCreateCustomer({ cedula }: { cedula: string }) {
    setPendingCustomerCedula(cedula)
    setEditingCustomer(null)
    setPaymentOpen(false)
    setCustomerFormOpen(true)
  }

  function handleRequestEditCustomer(customer: any) {
    setEditingCustomer(customer)
    setPendingCustomerCedula(null)
    setPaymentOpen(false)
    setCustomerFormOpen(true)
  }

  function handleCustomerFormClose() {
    setCustomerFormOpen(false)
    const customer = editingCustomer
    setEditingCustomer(null)
    setPendingCustomerCedula(null)
    if (customer || pendingCustomerCedula) {
      setJustEditedCustomer(customer)
      setPaymentOpen(true)
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center -m-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (hasConflict) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center -m-6">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-10 text-destructive" />
          </div>
          <h2 className="mb-2 text-xl font-bold">Sesión activa en otro lugar</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Esta sesión está siendo usada en otra pestaña, navegador o dispositivo.
          </p>
          <p className="mb-8 text-sm text-muted-foreground">
            La última sesión abierta tiene prioridad de acceso.
          </p>
          <Button
            onClick={() => {
              // Force reclaim the session by clearing localStorage and refreshing
              const presenceKey = `pos_active_tab_${activeSession?.user?.id}_${activeSession?.id}`
              localStorage.removeItem(presenceKey)
              window.location.reload()
            }}
            className="w-full"
          >
            Tomar control de la sesión
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Esto removerá la sesión activa en el otro lugar.
          </p>
        </div>
      </div>
    )
  }

  if (!activeSession) {
    return <SessionBlockerOverlay onSessionOpened={handleSessionOpened} onConflict={handleSessionConflict} />
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden">
      <BarcodeScanner onProductFound={handleAddProduct} />
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPrinterOpen(true)}>
              <Printer className="mr-2 size-4" />
              Impresora
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReturnOpen(true)}>
              <RotateCcw className="mr-2 size-4" />
              Devolución
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMovementOpen(true)}>
              <ArrowUpDown className="mr-2 size-4" />
              Movimiento
            </Button>
          </div>
          <ActiveSessionBadge onClose={() => setCloseSessionOpen(true)} />
        </div>
        <ProductGrid onAddProduct={handleAddProduct} />
      </div>
      <Cart
        items={cart.items}
        subtotal={cart.subtotal}
        tax={cart.tax}
        total={cart.total}
        isEmpty={cart.isEmpty}
        itemCount={cart.itemCount}
        onUpdateQuantity={cart.updateQuantity}
        onRemoveItem={cart.removeItem}
        onCheckout={handleCheckout}
      />
      <PrinterSettings open={printerOpen} onOpenChange={setPrinterOpen} />
      <ReturnDialog open={returnOpen} onOpenChange={(v) => { setReturnOpen(v); if (!v) setReturnSaleId(undefined) }} initialSaleId={returnSaleId} />
      <PaymentModal
        open={paymentOpen || !!saleResult}
        onOpenChange={(v) => {
          if (!v) {
            setPaymentOpen(false)
            if (saleResult) handleNewSale()
          }
        }}
        items={cart.items}
        subtotal={cart.subtotal}
        tax={cart.tax}
        total={cart.total}
        onConfirm={handleConfirmPayment}
        isProcessing={checkout.isPending}
        saleResult={saleResult}
        onNewSale={handleNewSale}
        onRequestCreateCustomer={handleRequestCreateCustomer}
        onRequestEditCustomer={handleRequestEditCustomer}
        preSelectedCustomer={justEditedCustomer}
        onPreSelectedCustomerConsumed={() => setJustEditedCustomer(null)}
      />
      <CloseSessionDialog open={closeSessionOpen} onOpenChange={(v) => { setCloseSessionOpen(v); if (!v) handleSessionOpened() }} refreshKey={sessionKey} />
      {activeSession && (
        <CashMovementForm
          open={movementOpen}
          onOpenChange={setMovementOpen}
          sessionId={activeSession.id}
          onSuccess={handleSessionOpened}
        />
      )}
      <CustomerForm
        open={customerFormOpen}
        onOpenChange={(open) => {
          if (!open) handleCustomerFormClose()
        }}
        customer={editingCustomer}
        defaultCedula={pendingCustomerCedula || undefined}
      />
    </div>
  )
}
