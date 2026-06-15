"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useIsMobile } from "@/hooks/use-is-mobile"
import { useSync } from "@/providers/sync-provider"
import { RotateCcw, Printer, Loader2, ArrowUpDown, AlertTriangle, ShoppingCart, MoreVertical, WifiOff } from "lucide-react"
import type { CartItem } from "@/features/pos/types"

async function fetchActiveSession() {
  try {
    const res = await fetch("/api/cash-sessions/active")
    if (!res.ok) {
      if (res.status === 401) return null
      throw new Error("Error al cargar sesión activa")
    }
    const data = await res.json()
    if (data?.id) {
      try { localStorage.setItem("hermes-active-session", JSON.stringify(data)) } catch {}
    }
    return data
  } catch (err) {
    const cached = localStorage.getItem("hermes-active-session")
    if (cached) {
      try { return JSON.parse(cached) } catch {}
    }
    throw err
  }
}

function useActiveSession(sessionKey: number) {
  const { data: session } = useSession()
  return useQuery({
    queryKey: ["active-session", sessionKey],
    queryFn: fetchActiveSession,
    refetchInterval: 30_000,
    retry: 0,
  })
}

export default function POSPage() {
  const { data: posSession } = useSession()
  const router = useRouter()
  const cart = useCart()
  const checkout = useCheckout()
  const searchParams = useSearchParams()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [saleResult, setSaleResult] = useState<any>(null)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnSaleId, setReturnSaleId] = useState<string | undefined>()

  useEffect(() => {
    if (posSession?.user?.role === "GOD") router.replace("/system-settings")
  }, [posSession, router])

  if (posSession?.user?.role === "GOD") return null
  const [printerOpen, setPrinterOpen] = useState(false)
  const [closeSessionOpen, setCloseSessionOpen] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const [customerFormOpen, setCustomerFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [pendingCustomerCedula, setPendingCustomerCedula] = useState<string | null>(null)
  const [justEditedCustomer, setJustEditedCustomer] = useState<any>(null)
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const newlyCreatedCustomerRef = useRef<any>(null)
  const isMobile = useIsMobile()

  const { data: activeSession, isLoading: sessionLoading } = useActiveSession(sessionKey)
  const { isOnline } = useSync()

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

  // Atajo de teclado: Space para abrir cobro si hay productos en el carrito
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== " " && e.key !== "Spacebar") return
      if (cart.isEmpty) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (paymentOpen || returnOpen || printerOpen || closeSessionOpen || movementOpen || customerFormOpen || cartSheetOpen) return

      e.preventDefault()
      handleCheckout()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [cart.isEmpty, paymentOpen, returnOpen, printerOpen, closeSessionOpen, movementOpen, customerFormOpen, cartSheetOpen, handleCheckout])

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
    // Forzar refresco para ver el estado de conflicto
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

  function handleCustomerCreated(customer: any) {
    newlyCreatedCustomerRef.current = customer
  }

  function handleCustomerFormClose() {
    setCustomerFormOpen(false)
    const customer = newlyCreatedCustomerRef.current ?? editingCustomer
    newlyCreatedCustomerRef.current = null
    setEditingCustomer(null)
    setPendingCustomerCedula(null)
    if (customer || pendingCustomerCedula) {
      setJustEditedCustomer(customer)
      setPaymentOpen(true)
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center -m-4 md:-m-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (hasConflict) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center -m-4 md:-m-6">
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
              // Forzar la recuperación de la sesión limpiando localStorage y refrescando
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
    <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-6 overflow-hidden">
      <BarcodeScanner onProductFound={handleAddProduct} />
      <div className="flex flex-1 flex-col min-w-0">
        {!isOnline && (
          <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-400">
            <WifiOff className="size-3.5 shrink-0" />
            <span>Modo offline — las ventas se guardarán localmente y se sincronizarán al recuperar la conexión.</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 md:px-6 pt-4 md:pt-6 pb-2 gap-2">
          <div className="hidden md:flex items-center gap-2">
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
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex size-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted hover:text-foreground touch-target">
                <MoreVertical className="size-5" />
                <span className="sr-only">Más acciones</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => setPrinterOpen(true)} className="py-2.5">
                  <Printer className="mr-2 size-4" />
                  Impresora
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReturnOpen(true)} className="py-2.5">
                  <RotateCcw className="mr-2 size-4" />
                  Devolución
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMovementOpen(true)} className="py-2.5">
                  <ArrowUpDown className="mr-2 size-4" />
                  Movimiento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ActiveSessionBadge
            onClose={() => setCloseSessionOpen(true)}
            compact={isMobile}
          />
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

      {/* FAB móvil para abrir el cart en un Sheet */}
      <div className="md:hidden fixed right-4 bottom-24 z-20 safe-bottom">
        <Button
          onClick={() => setCartSheetOpen(true)}
          className="size-14 rounded-full shadow-lg touch-target"
          size="icon"
          aria-label={`Ver carrito (${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"})`}
        >
          <ShoppingCart className="size-6" />
          {cart.itemCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground font-mono">
              {cart.itemCount}
            </span>
          )}
        </Button>
      </div>

      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent
          side="bottom"
          className="h-[85vh] max-h-[85vh] p-0 rounded-t-lg flex flex-col"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Carrito de compras</SheetTitle>
          </SheetHeader>
          <Cart
            items={cart.items}
            subtotal={cart.subtotal}
            tax={cart.tax}
            total={cart.total}
            isEmpty={cart.isEmpty}
            itemCount={cart.itemCount}
            onUpdateQuantity={cart.updateQuantity}
            onRemoveItem={cart.removeItem}
            onCheckout={() => {
              setCartSheetOpen(false)
              handleCheckout()
            }}
            variant="sheet"
            onClose={() => setCartSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

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
        onCreated={handleCustomerCreated}
      />
    </div>
  )
}
