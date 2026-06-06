"use client"

import { useEffect, useState, useCallback, useRef } from "react"

const PRESENCE_KEY_PREFIX = "pos_active_tab_"
const PRESENCE_TIMEOUT_MS = 30 * 1000 // 30 segundos: sin heartbeat, la pestaña se considera muerta

interface PresenceData {
  userId: string
  sessionId: string
  tabId: string
  lastHeartbeat: number
}

function getPresenceKey(userId: string, sessionId: string) {
  return `${PRESENCE_KEY_PREFIX}${userId}_${sessionId}`
}

export function usePresenceMonitor(userId: string | null, sessionId: string | null) {
  const [hasConflict, setHasConflict] = useState(false)
  const [winningTabId, setWinningTabId] = useState<string | null>(null)
  const [tabId] = useState(() => `tab-${Date.now()}-${Math.random().toString(36).substring(7)}`)
  const isInitializedRef = useRef(false)

  const registerPresence = useCallback(() => {
    if (!userId || !sessionId) return

    const presenceKey = getPresenceKey(userId, sessionId)
    const data: PresenceData = {
      userId,
      sessionId,
      tabId,
      lastHeartbeat: Date.now(),
    }

    try {
      localStorage.setItem(presenceKey, JSON.stringify(data))
    } catch (e) {
      // localStorage puede estar lleno o deshabilitado
    }
  }, [userId, sessionId, tabId])

  const unregisterPresence = useCallback(() => {
    if (!userId || !sessionId) return

    const presenceKey = getPresenceKey(userId, sessionId)
    try {
      const existing = localStorage.getItem(presenceKey)
      if (existing) {
        const parsed: PresenceData = JSON.parse(existing)
        if (parsed.tabId === tabId) {
          localStorage.removeItem(presenceKey)
        }
      }
    } catch (e) {
      // Ignorar
    }
  }, [userId, sessionId, tabId])

  useEffect(() => {
    if (!userId || !sessionId || isInitializedRef.current) return
    isInitializedRef.current = true

    const presenceKey = getPresenceKey(userId, sessionId)

    // Registrar de inmediato
    registerPresence()

    const checkAndMaintainPresence = () => {
      try {
        const existing = localStorage.getItem(presenceKey)
        const now = Date.now()
        const isStale = existing && (now - JSON.parse(existing).lastHeartbeat) > PRESENCE_TIMEOUT_MS

        if (!existing || isStale) {
          // No hay presencia registrada o está obsoleta: podemos reclamarla
          registerPresence()
          setHasConflict(false)
          setWinningTabId(null)
          return
        }

        const parsed: PresenceData = JSON.parse(existing)

        if (parsed.tabId === tabId) {
          // Es nuestra propia presencia, actualizar heartbeat
          registerPresence()
          setHasConflict(false)
          setWinningTabId(null)
          return
        }

        // Hay otra pestaña activa
        // Gana la que tenga el heartbeat MÁS RECIENTE
        if (parsed.lastHeartbeat > now - 20000) {
          // La otra pestaña sigue enviando heartbeats (en los últimos 20 segundos)
          // Perdemos: otra pestaña tiene la sesión activa
          setHasConflict(true)
          setWinningTabId(parsed.tabId)
          return
        }

        // La otra pestaña existe pero no ha enviado heartbeat recientemente
        // Reclamar la sesión
        registerPresence()
        setHasConflict(false)
        setWinningTabId(null)
      } catch (e) {
        // Ante un error, intentar reclamar la sesión
        registerPresence()
        setHasConflict(false)
        setWinningTabId(null)
      }
    }

    // Chequeo inicial
    checkAndMaintainPresence()

    // Chequear y mantener la presencia cada 5 segundos
    const interval = setInterval(checkAndMaintainPresence, 5000)

    // Escuchar también cambios de storage desde otras pestañas
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith(PRESENCE_KEY_PREFIX)) {
        // Algo cambió, re-chequear
        checkAndMaintainPresence()
      }
    }

    window.addEventListener("storage", handleStorageChange)

    // Limpieza al desmontar
    return () => {
      clearInterval(interval)
      window.removeEventListener("storage", handleStorageChange)
      unregisterPresence()
      isInitializedRef.current = false
    }
  }, [userId, sessionId, tabId, registerPresence, unregisterPresence])

  return { hasConflict, winningTabId, tabId }
}
