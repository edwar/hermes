"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Scale, BluetoothOff, Wifi } from "lucide-react"
import { useScale } from "@/features/pos/hooks/use-scale"

interface ScaleInputProps {
  weightUnit: string
  weightInGrams: number
  onWeightChange: (weightInGrams: number) => void
}

export function ScaleInput({ weightUnit, weightInGrams, onWeightChange }: ScaleInputProps) {
  const { connected, weight, connecting, error, requestScale, reconnectScale, disconnectScale } = useScale()

  useEffect(() => {
    reconnectScale()
  }, [reconnectScale])

  const displayValue = weightUnit === "kg" ? weightInGrams / 1000 : weightInGrams
  const step = weightUnit === "kg" ? "0.1" : "1"

  function handleTakeWeight() {
    if (weight !== null) {
      const grams = weightUnit === "kg" ? Math.round(weight * 1000) : Math.round(weight * (weightUnit === "lb" ? 453.592 : 1))
      onWeightChange(grams)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {connected ? (
            <>
              <Wifi className="size-3 text-green-600" />
              <span className="text-green-600 font-medium">Báscula conectada</span>
            </>
          ) : (
            <>
              <BluetoothOff className="size-3 text-muted-foreground" />
              <span>Báscula no conectada</span>
            </>
          )}
        </div>
        {connected && weight !== null && (
          <span className="text-xs font-mono tabular-nums font-bold text-primary">
            {weight.toFixed(3)} kg
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            min="0"
            step={step}
            value={displayValue === 0 ? "" : displayValue}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0
              const grams = weightUnit === "kg" ? Math.round(val * 1000) : Math.round(val)
              onWeightChange(grams)
            }}
            placeholder="0"
            className="h-9 text-sm font-mono text-center"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {weightUnit}
          </span>
        </div>

        {connected && weight !== null && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTakeWeight}
            className="h-9 shrink-0 gap-1.5"
          >
            <Scale className="size-3.5" />
            Tomar peso
          </Button>
        )}

        {!connected && !connecting && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={requestScale}
            className="h-9 shrink-0 gap-1.5"
          >
            <Scale className="size-3.5" />
            Conectar
          </Button>
        )}

        {connecting && (
          <Button type="button" variant="outline" size="sm" disabled className="h-9 shrink-0 gap-1.5">
            <Loader2 className="size-3.5 animate-spin" />
            Conectando
          </Button>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}
    </div>
  )
}
