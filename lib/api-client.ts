"use client"

import { db, type OfflineMutation } from "@/lib/db"
import { HTTP_METHOD, CONTENT_TYPE, HEADER_NAME } from "@/lib/constants"

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
  method?: typeof HTTP_METHOD.GET | typeof HTTP_METHOD.POST | typeof HTTP_METHOD.PUT | typeof HTTP_METHOD.PATCH | typeof HTTP_METHOD.DELETE
  body?: unknown
  headers?: Record<string, string>
  resource?: string
  entityId?: string | null
  mockResponse?: (body: unknown, clientId: string) => TMock
  queueable?: boolean
  forceQueue?: boolean
  /**
   * Tiempo máximo de espera antes de tratar la petición como caída de red y encolarla.
   * Las operaciones que llaman a un servicio externo (factura electrónica, nota crédito) tardan más
   * que el valor por defecto: con él, el servidor completa la operación pero el POS la da por perdida.
   */
  timeoutMs?: number
}

export const DEFAULT_TIMEOUT_MS = 5_000
/** Venta o devolución que emite un documento ante la DIAN: el proveedor puede tardar varios segundos. */
export const ELECTRONIC_INVOICE_TIMEOUT_MS = 45_000

const MUTATING_METHODS = new Set([HTTP_METHOD.POST, HTTP_METHOD.PUT, HTTP_METHOD.PATCH, HTTP_METHOD.DELETE])

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
    method = HTTP_METHOD.GET,
    body,
    headers,
    resource,
    entityId,
    mockResponse,
    queueable = true,
    forceQueue = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options

  const isMutation = method ? MUTATING_METHODS.has(method.toUpperCase() as typeof HTTP_METHOD.POST | typeof HTTP_METHOD.PUT | typeof HTTP_METHOD.PATCH | typeof HTTP_METHOD.DELETE) : false

  if (
    isMutation &&
    queueable &&
    (forceQueue || (typeof navigator !== "undefined" && navigator.onLine === false))
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
      [HEADER_NAME.CONTENT_TYPE]: CONTENT_TYPE.JSON,
      ...headers,
    },
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
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
