import { Skeleton } from "@/components/ui/skeleton"

export default function POSLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-4 md:-m-6 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2 md:px-6 md:pt-6">
          <div className="hidden gap-2 md:flex">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-12 w-60" />
        </div>
        <div className="flex flex-1 flex-col p-4 pb-24 md:p-6 md:pb-6">
          <Skeleton className="mb-3 h-11 w-full md:mb-4 md:h-12" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-[108px]" />
            ))}
          </div>
        </div>
      </div>
      <div className="hidden w-[400px] flex-col border-l border-border md:flex">
        <div className="flex h-12 items-center gap-2.5 border-b border-border px-4">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-5 w-14" />
        </div>
        <div className="flex-1 divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 px-4 py-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-9 w-[104px]" />
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t border-border px-4 py-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  )
}
