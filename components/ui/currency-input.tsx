"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useSettings } from "@/hooks/use-settings"

interface CurrencyInputProps
  extends Omit<
    React.ComponentProps<"input">,
    "value" | "onChange" | "type" | "inputMode"
  > {
  value: string
  onChange: (numericString: string) => void
  currency?: string
  locale?: string
}

function extractDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 15)
}

function isDigit(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 48 && code <= 57
}

function countDigitsToLeft(str: string, caret: number): number {
  const limit = Math.min(caret, str.length)
  let count = 0
  for (let i = 0; i < limit; i++) {
    if (isDigit(str[i])) count++
  }
  return count
}

function findCaretByDigits(str: string, target: number): number {
  if (target <= 0) return 0
  let count = 0
  for (let i = 0; i < str.length; i++) {
    if (isDigit(str[i])) {
      count++
      if (count === target) return i + 1
    }
  }
  return str.length
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    {
      value,
      onChange,
      currency: currencyProp,
      locale = "es-CO",
      className,
      ...rest
    },
    ref
  ) {
    const { settings } = useSettings()
    const currency = currencyProp ?? settings?.currency ?? "COP"
    const innerRef = React.useRef<HTMLInputElement | null>(null)
    const composingRef = React.useRef(false)

    const formatter = React.useMemo(
      () =>
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
      [currency, locale]
    )

    const display = React.useMemo(() => {
      if (!value) return ""
      const n = Number(value)
      if (!Number.isFinite(n)) return ""
      try {
        return formatter.format(n)
      } catch {
        return value
      }
    }, [value, formatter])

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ;(ref as React.MutableRefObject<HTMLInputElement | null>).current = node
        }
      },
      [ref]
    )

    function restoreCaret(digitsLeft: number) {
      const el = innerRef.current
      if (!el) return
      const pos = findCaretByDigits(el.value, digitsLeft)
      try {
        el.setSelectionRange(pos, pos)
      } catch {
        // ignore (e.g. element not focusable)
      }
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      if (composingRef.current) return
      const raw = e.target.value
      const caret = e.target.selectionStart ?? raw.length
      const digitsLeft = countDigitsToLeft(raw, caret)
      const numeric = extractDigits(raw)
      onChange(numeric)
      requestAnimationFrame(() => restoreCaret(digitsLeft))
    }

    function handleCompositionStart() {
      composingRef.current = true
    }

    function handleCompositionEnd(
      e: React.CompositionEvent<HTMLInputElement>
    ) {
      composingRef.current = false
      handleChange(e as unknown as React.ChangeEvent<HTMLInputElement>)
    }

    return (
      <Input
        ref={setRefs}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        className={cn("font-mono tabular-nums", className)}
        {...rest}
      />
    )
  }
)

export { CurrencyInput }
export type { CurrencyInputProps }
