import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { processReplayQueue } from "@/lib/sync-replay"

interface BatchItem {
  clientId: string
  method: "POST" | "PUT" | "PATCH" | "DELETE"
  url: string
  body: string | null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = (await req.json()) as { items?: BatchItem[] }
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "items requerido" }, { status: 400 })
  }

  const replayHeaders: Record<string, string> = {}
  const cookie = req.headers.get("cookie")
  if (cookie) replayHeaders.cookie = cookie
  const authz = req.headers.get("authorization")
  if (authz) replayHeaders.authorization = authz

  const results = []
  for (const item of body.items) {
    if (!item.clientId || !item.method || !item.url) {
      results.push({
        clientId: item.clientId ?? "unknown",
        ok: false,
        status: 400,
        response: { error: "item inválido" },
      })
      continue
    }

    if (!item.url.startsWith("/api/")) {
      results.push({
        clientId: item.clientId,
        ok: false,
        status: 400,
        response: { error: "URL debe ser relativa a /api" },
      })
      continue
    }

    try {
      const r = await processReplayQueue(
        item.clientId,
        {
          method: item.method,
          url: item.url,
          body: item.body,
        },
        replayHeaders
      )
      results.push(r)
    } catch (err) {
      results.push({
        clientId: item.clientId,
        ok: false,
        status: 500,
        response: { error: (err as Error).message },
      })
    }
  }

  return NextResponse.json({ results })
}
