import { Skeleton } from "@/components/ui/skeleton"

// Calca la estructura de la página: un título, párrafos y listas de casillas.
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-7 w-1/2" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  )
}
