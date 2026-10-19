"use client"

import { createContext, useContext, useMemo } from "react"

const AllowedModulesContext = createContext<ReadonlySet<string> | null>(null)

/** Módulos que la persona puede usar, ya resueltos en el servidor (reglas guardadas + valores por defecto). */
export function AllowedModulesProvider({ modules, children }: { modules: string[]; children: React.ReactNode }) {
  const set = useMemo(() => new Set(modules), [modules])
  return <AllowedModulesContext.Provider value={set}>{children}</AllowedModulesContext.Provider>
}

export function useCanSee() {
  const modules = useContext(AllowedModulesContext)
  return (href: string) => !!modules && modules.has(href)
}
