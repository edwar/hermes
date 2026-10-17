"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2, BadgeCheck, AlertCircle } from "lucide-react"
import { sileo } from "sileo"
import { apiFetch } from "@/lib/api-client"

export function CreditBalanceCard() {
  const [balance, setBalance] = useState<number | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [buyOpen, setBuyOpen] = useState(false)
  const [quantity, setQuantity] = useState("")
  const [purchasing, setPurchasing] = useState(false)

  async function fetchCredits() {
    try {
      const res = await fetch("/api/factus/credits")
      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance)
        setTotal(data.total)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCredits() }, [])

  async function handlePurchase() {
    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) {
      sileo.error({ title: "Cantidad inválida" })
      return
    }
    setPurchasing(true)
    try {
      const result = await apiFetch<Record<string, unknown>>("/api/factus/credits", {
        method: "POST",
        body: { quantity: qty },
        resource: "factus-credits",
        queueable: false,
      })
      if (result.ok) {
        sileo.success({ title: result.queued ? `Compra encolada: ${qty} crédito(s)` : `${qty} crédito(s) agregado(s)` })
        setBuyOpen(false)
        setQuantity("")
        if (!result.queued) fetchCredits()
      } else {
        sileo.error({ title: result.error || "Error al comprar créditos" })
      }
    } catch {
      sileo.error({ title: "Error al comprar créditos" })
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck className="size-4 text-primary" />
          Créditos de facturación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-xs text-muted-foreground">Saldo disponible</p>
            <p className={`text-2xl font-bold font-mono tabular-nums ${(balance ?? 0) <= 0 ? "text-destructive" : "text-success"}`}>
              {balance ?? 0}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total comprados</p>
            <p className="text-lg font-semibold font-mono tabular-nums">{total ?? 0}</p>
          </div>
        </div>

        {(balance ?? 0) <= 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Sin créditos disponibles</p>
              <p className="text-xs text-warning">
                No hay créditos de facturación electrónica. Las facturas no se emitirán hasta que agregues más.
              </p>
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => setBuyOpen(true)}>
          <Plus className="mr-1 size-4" /> Comprar créditos
        </Button>

        {buyOpen && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="credit-qty">Cantidad de créditos</Label>
              <Input
                id="credit-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej: 100"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setBuyOpen(false); setQuantity("") }} className="flex-1">
                Cancelar
              </Button>
              <Button size="sm" onClick={handlePurchase} disabled={purchasing || !quantity} className="flex-1">
                {purchasing ? <><Loader2 className="mr-1 size-4 animate-spin" /> Comprando...</> : "Comprar"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
