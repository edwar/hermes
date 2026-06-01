"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

const HEARTBEAT_INTERVAL_MS = 30 * 1000 // 30 seconds

export function useSessionHeartbeat(sessionId: string | null) {
  const queryClient = useQueryClient()
  const deviceIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    // Generate device ID once
    if (!deviceIdRef.current) {
      const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
      const nav = `${navigator.userAgent.substring(0, 50)}`
      const time = new Date().getTimezoneOffset()
      deviceIdRef.current = btoa(`${screen}|${nav}|${time}`).substring(0, 32)
    }

    const sendHeartbeat = async () => {
      try {
        await fetch("/api/cash-sessions/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, deviceId: deviceIdRef.current }),
        })
      } catch (err) {
        console.error("Heartbeat failed:", err)
      }
    }

    // Send immediately
    sendHeartbeat()

    // Send every 30 seconds
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [sessionId, queryClient])
}