import { Skeleton } from "@/components/ui/skeleton"

export default function POSLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-12 flex-1" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
      <div className="w-96 border-l p-4 space-y-3">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}
