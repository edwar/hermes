"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  page: number
  pages: number
  onPageChange: (page: number) => void
  total?: number
  className?: string
}

export function Pagination({ page, pages, onPageChange, total, className }: PaginationProps) {
  if (pages <= 1) return null

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="text-sm text-muted-foreground">
        {total !== undefined && (
          <span>{total} registros</span>
        )}
        <span className="hidden sm:inline">
          {" "}— Página {page} de {pages}
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
