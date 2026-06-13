import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(currency: string, locale: string) {
  const key = `${locale}:${currency}`
  let fmt = formatterCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    formatterCache.set(key, fmt)
  }
  return fmt
}

export function formatCurrency(
  value: number,
  currency = "COP",
  locale = "es-CO"
) {
  return getFormatter(currency, locale).format(value)
}

export function formatCOP(value: number) {
  return formatCurrency(value, "COP")
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date))
}
