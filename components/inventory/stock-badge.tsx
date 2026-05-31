import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StockBadgeProps {
  stock: number
  minStock: number
}

export function StockBadge({ stock, minStock }: StockBadgeProps) {
  const isLow = stock <= minStock
  const isOut = stock === 0

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono",
        isOut && "bg-destructive/10 text-destructive border-destructive/20",
        isLow && !isOut && "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
        !isLow && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      )}
    >
      {stock}
    </Badge>
  )
}
