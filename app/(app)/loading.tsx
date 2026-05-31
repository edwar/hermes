import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6">
            <div className="flex items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4" />
            </div>
            <Skeleton className="mt-2 h-8 w-20" />
            <Skeleton className="mt-1 h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}
