import { prisma } from "@/lib/prisma"

interface ReplayRequest {
  method: "POST" | "PUT" | "PATCH" | "DELETE"
  url: string
  body: string | null
}

interface ReplayResult {
  clientId: string
  ok: boolean
  status: number
  response: unknown
}

export async function processReplayQueue(
  clientId: string,
  request: ReplayRequest
): Promise<ReplayResult> {
  const existing = await prisma.processedSyncRequest.findUnique({
    where: {
      clientId_method_url: {
        clientId,
        method: request.method,
        url: request.url,
      },
    },
  })

  if (existing) {
    return {
      clientId,
      ok: existing.status >= 200 && existing.status < 300,
      status: existing.status,
      response: JSON.parse(existing.responseJson),
    }
  }

  const res = await fetch(`${process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000"}${request.url}`, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      "x-offline-replay": "true",
      "x-offline-client-id": clientId,
    },
    body: request.body ?? undefined,
  })

  let responseBody: unknown
  try {
    responseBody = await res.json()
  } catch {
    responseBody = null
  }

  try {
    await prisma.processedSyncRequest.create({
      data: {
        clientId,
        method: request.method,
        url: request.url,
        status: res.status,
        responseJson: JSON.stringify(responseBody),
      },
    })
  } catch {
  }

  return {
    clientId,
    ok: res.ok,
    status: res.status,
    response: responseBody,
  }
}
