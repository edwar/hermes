import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
}

export function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 border-[oklch(0.88_0.01_50)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-sans text-sm font-bold text-muted-foreground tracking-wide uppercase">
          {title}
        </CardTitle>
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-sans text-2xl font-bold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
