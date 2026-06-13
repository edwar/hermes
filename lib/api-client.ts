"use client"

import { db, type OfflineMutation } from "@/lib/db"

export type QueuedResponse<T = unknown> = {
  ok: true
  queued: true
  clientId: string
  resource: string
  mock: T
}

export type ApiResponse<T> =
  | { ok: true; queued?: false; status: number; data: T }
  | QueuedResponse<T>
  | {
      ok: false
      status: number
      error: string
      validation?: unknown
    }

export interface ApiFetchOptions<TMock = unknown> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
  resource?: string
  entityId?: string | null
  mockResponse?: (body: unknown, clientId: string) => TMock
  queueable?: boolean
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true
  if (err instanceof DOMException && err.name === "AbortError") return true
  if (err instanceof Error) {
    const m = err.message
    return (
      m.includes("fetch") ||
      m.includes("network") ||
      m.includes("Failed to fetch") ||
      m.includes("NetworkError") ||
      m.includes("Network request failed") ||
      m.includes("aborted") ||
      m.includes("ERR_NAME_NOT_RESOLVED") ||
      m.includes("ERR_INTERNET_DISCONNECTED") ||
      m.includes("ERR_CONNECTION_RESET") ||
      m.includes("ERR_CONNECTION_REFUSED") ||
      m.includes("ERR_TIMED_OUT")
    )
  }
  return false
}

function makeMock(body: unknown, clientId: string, resource?: string): Record<string, unknown> {
  const baseId =
    body && typeof body === "object" && "id" in body && typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id
      : null
  return {
    id: baseId ?? clientId,
    clientId,
    _queued: true,
    _resource: resource ?? null,
    _createdAt: new Date().toISOString(),
    ...(body && typeof body === "object" ? body : {}),
  }
}

interface EnqueueArgs {
  resource?: string
  entityId?: string | null
  body: unknown
  method: string
  url: string
  mockFactory?: (body: unknown, clientId: string) => unknown
}

async function enqueueMutation<T>({
  resource,
  entityId,
  body,
  method,
  url,
  mockFactory,
}: EnqueueArgs): Promise<QueuedResponse<T> | { ok: false; status: number; error: string }> {
  const clientId = `${resource ?? "op"}-${crypto.randomUUID()}`
  const mock = (mockFactory
    ? mockFactory(body, clientId)
    : makeMock(body, clientId, resource)) as T

  const mutation: OfflineMutation = {
    clientId,
    method: method.toUpperCase() as OfflineMutation["method"],
    url,
    body: body !== undefined && body !== null ? JSON.stringify(body) : null,
    resource: resource ?? url,
    entityId: entityId ?? null,
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
  }

  try {
    await db.offlineMutations.add(mutation)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hermes:queue-updated"))
    }
    return {
      ok: true,
      queued: true,
      clientId,
      resource: resource ?? url,
      mock,
    }
  } catch (queueErr) {
    console.error("[api-client] No se pudo encolar la operación:", queueErr)
    return {
      ok: false,
      status: 0,
      error: "No se pudo guardar la operación localmente",
    }
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions<T> = {}
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    headers,
    resource,
    entityId,
    mockResponse,
    queueable = true,
  } = options

  const isMutation = MUTATING_METHODS.has(method.toUpperCase())

  if (
    isMutation &&
    queueable &&
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  ) {
    return enqueueMutation<T>({
      resource,
      entityId,
      body,
      method,
      url,
      mockFactory: mockResponse as ((b: unknown, c: string) => unknown) | undefined,
    })
  }

  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  }

  const NETWORK_TIMEOUT_MS = 5_000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS)
  init.signal = controller.signal

  try {
    const res = await fetch(url, init)

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      const message =
        errBody?.error?.message ??
        errBody?.error ??
        errBody?.message ??
        `Error ${res.status}`

      if (res.status >= 500 && isMutation && queueable) {
        return await enqueueMutation<T>({
          resource,
          entityId,
          body,
          method,
          url,
          mockFactory: mockResponse as ((b: unknown, c: string) => unknown) | undefined,
        })
      }

      return {
        ok: false,
        status: res.status,
        error: String(message),
        validation: errBody?.error?.issues ?? errBody?.issues,
      }
    }

    let data: T
    if (res.status === 204) {
      data = undefined as T
    } else {
      data = (await res.json()) as T
    }
    clearTimeout(timeoutId)
    return { ok: true, status: res.status, data }
  } catch (err) {
    clearTimeout(timeoutId)
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false

    if (!isOffline && !isNetworkError(err)) {
      throw err
    }

    if (!isMutation || !queueable) {
      return {
        ok: false,
        status: 0,
        error: isOffline ? "Sin conexión" : (err as Error).message,
      }
    }

    return await enqueueMutation<T>({
      resource,
      entityId,
      body,
      method,
      url,
      mockFactory: mockResponse as ((b: unknown, c: string) => unknown) | undefined,
    })
  }
}

export async function queueCount(): Promise<number> {
  return db.offlineMutations.where("status").equals("pending").count()
}

export async function listQueued(): Promise<OfflineMutation[]> {
  return db.offlineMutations
    .where("status")
    .equals("pending")
    .sortBy("createdAt")
}
