"use client"

import { useEffect, useState, useCallback, useRef } from "react"

const PRESENCE_KEY_PREFIX = "pos_active_tab_"
const PRESENCE_TIMEOUT_MS = 30 * 1000 // 30 seconds - if no heartbeat, tab is dead

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
      // localStorage might be full or disabled
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
      // ignore
    }
  }, [userId, sessionId, tabId])

  useEffect(() => {
    if (!userId || !sessionId || isInitializedRef.current) return
    isInitializedRef.current = true

    const presenceKey = getPresenceKey(userId, sessionId)

    // Register immediately
    registerPresence()

    const checkAndMaintainPresence = () => {
      try {
        const existing = localStorage.getItem(presenceKey)
        const now = Date.now()
        const isStale = existing && (now - JSON.parse(existing).lastHeartbeat) > PRESENCE_TIMEOUT_MS

        if (!existing || isStale) {
          // No presence registered or stale, we can claim it
          registerPresence()
          setHasConflict(false)
          setWinningTabId(null)
          return
        }

        const parsed: PresenceData = JSON.parse(existing)

        if (parsed.tabId === tabId) {
          // It's our own presence, update heartbeat
          registerPresence()
          setHasConflict(false)
          setWinningTabId(null)
          return
        }

        // There's another active tab
        // The one with the LATEST heartbeat wins
        if (parsed.lastHeartbeat > now - 20000) {
          // Other tab is still sending heartbeats (within 20 seconds)
          // We lose - someone else has the active session
          setHasConflict(true)
          setWinningTabId(parsed.tabId)
          return
        }

        // Other tab exists but hasn't sent heartbeat recently
        // Claim the session
        registerPresence()
        setHasConflict(false)
        setWinningTabId(null)
      } catch (e) {
        // On error, try to claim the session
        registerPresence()
        setHasConflict(false)
        setWinningTabId(null)
      }
    }

    // Initial check
    checkAndMaintainPresence()

    // Check and maintain presence every 5 seconds
    const interval = setInterval(checkAndMaintainPresence, 5000)

    // Also listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith(PRESENCE_KEY_PREFIX)) {
        // Something changed, re-check
        checkAndMaintainPresence()
      }
    }

    window.addEventListener("storage", handleStorageChange)

    // Cleanup
    return () => {
      clearInterval(interval)
      window.removeEventListener("storage", handleStorageChange)
      unregisterPresence()
      isInitializedRef.current = false
    }
  }, [userId, sessionId, tabId, registerPresence, unregisterPresence])

  return { hasConflict, winningTabId, tabId }
}