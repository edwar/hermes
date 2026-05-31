"use client"

import { useQuery } from "@tanstack/react-query"

async function fetchDashboard() {
  const res = await fetch("/api/dashboard")
  if (!res.ok) throw new Error("Error al cargar dashboard")
  return res.json()
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30_000,
  })
}
