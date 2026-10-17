"use client"

import * as React from "react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"
import { Popover } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  align?: "start" | "center" | "end"
  minDate?: string
  maxDate?: string
  id?: string
}

function parseISODate(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toISODate(date: Date | null): string {
  if (!date) return ""
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]

function Calendar({
  selected,
  onSelect,
  month,
  onMonthChange,
  minDate,
  maxDate,
}: {
  selected: Date | null
  onSelect: (date: Date) => void
  month: Date
  onMonthChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
}) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  function isDisabled(day: Date): boolean {
    if (minDate && isBefore(day, startOfDay(minDate))) return true
    if (maxDate && isAfter(day, startOfDay(maxDate))) return true
    return false
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between pb-3">
        <span className="text-sm font-semibold capitalize">
          {format(month, "MMMM yyyy", { locale: es })}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(subMonths(month, 1))}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Mes anterior"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Mes siguiente"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 pb-2 text-center">
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const isSelected = selected && isSameDay(day, selected)
          const isCurrentDay = isToday(day)
          const disabled = isDisabled(day)

          return (
            <div key={day.toISOString()} className="flex items-center justify-center p-0.5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(day)}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  !inMonth && "text-muted-foreground/40",
                  inMonth && !isSelected && "hover:bg-accent",
                  isSelected && "bg-primary text-primary-foreground font-semibold",
                  !isSelected && isCurrentDay && "ring-1 ring-inset ring-primary/60",
                  disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                )}
              >
                {day.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  className,
  disabled,
  align = "start",
  minDate,
  maxDate,
  id,
}: DatePickerProps) {
  const selected = React.useMemo(() => parseISODate(value), [value])
  const [open, setOpen] = React.useState(false)
  const [viewMonth, setViewMonth] = React.useState<Date | null>(null)
  const minDateParsed = React.useMemo(
    () => (minDate ? parseISODate(minDate) ?? undefined : undefined),
    [minDate]
  )
  const maxDateParsed = React.useMemo(
    () => (maxDate ? parseISODate(maxDate) ?? undefined : undefined),
    [maxDate]
  )

  const displayMonth = viewMonth ?? selected ?? new Date()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen && !viewMonth) {
      setViewMonth(selected ?? new Date())
    }
  }

  function handleSelect(day: Date) {
    onChange(toISODate(day))
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange("")
  }

  const displayText = selected
    ? format(selected, "d 'de' MMMM, yyyy", { locale: es })
    : placeholder

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <div className="relative w-full">
        <Popover.Trigger
          id={id}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate capitalize">{displayText}</span>
          </span>
          {selected && !disabled && <span aria-hidden className="size-5 shrink-0" />}
        </Popover.Trigger>
        {selected && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpiar fecha"
            className="absolute right-2 top-1/2 z-10 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>

      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align={align}
          sideOffset={6}
          collisionAvoidance={{ side: "none" }}
          className="isolate z-50"
        >
          <Popover.Popup className="w-72 origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow-none border border-border data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Calendar
              selected={selected}
              onSelect={handleSelect}
              month={displayMonth}
              onMonthChange={setViewMonth}
              minDate={minDateParsed}
              maxDate={maxDateParsed}
            />
            <div className="flex items-center justify-between border-t px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  setViewMonth(today)
                  onChange(toISODate(today))
                  setOpen(false)
                }}
              >
                Hoy
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { DatePicker }
export type { DatePickerProps }
