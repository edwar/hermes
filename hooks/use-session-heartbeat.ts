"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

const HEARTBEAT_INTERVAL_MS = 30 * 1000
const BACKOFF_INTERVAL_MS = 90 * 1000
const BACKOFF_AFTER_FAILURES = 2

export function useSessionHeartbeat(sessionId: string | null) {
  const queryClient = useQueryClient()
  const deviceIdRef = useRef<string | null>(null)
  const failuresRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!sessionId) return

    if (!deviceIdRef.current) {
      const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
      const nav = `${navigator.userAgent.substring(0, 50)}`
      const time = new Date().getTimezoneOffset()
      deviceIdRef.current = btoa(`${screen}|${nav}|${time}`).substring(0, 32)
    }

    const sendHeartbeat = async (): Promise<boolean> => {
      if (!navigator.onLine) {
        return false
      }
      try {
        const res = await fetch("/api/cash-sessions/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            deviceId: deviceIdRef.current,
          }),
        })
        if (res.status >= 500) {
          return false
        }
        return res.ok
      } catch {
        return false
      }
    }

    let cancelled = false

    const scheduleNext = () => {
      if (cancelled) return
      const delay =
        failuresRef.current >= BACKOFF_AFTER_FAILURES
          ? BACKOFF_INTERVAL_MS
          : HEARTBEAT_INTERVAL_MS
      intervalRef.current = setTimeout(tick, delay)
    }

    const tick = async () => {
      if (cancelled) return
      const ok = await sendHeartbeat()
      if (ok) {
        failuresRef.current = 0
      } else {
        failuresRef.current = Math.min(failuresRef.current + 1, 10)
      }
      scheduleNext()
    }

    void sendHeartbeat().then((ok) => {
      if (ok) failuresRef.current = 0
      else failuresRef.current = 1
      scheduleNext()
    })

    return () => {
      cancelled = true
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  }, [sessionId, queryClient])
}
