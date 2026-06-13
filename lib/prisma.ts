import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaProxied: unknown
}

function buildDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) return baseUrl as string
  if (baseUrl.includes("connection_limit") || baseUrl.includes("pool_timeout")) {
    return baseUrl
  }
  const separator = baseUrl.includes("?") ? "&" : "?"
  return `${baseUrl}${separator}connection_limit=3&pool_timeout=10&socket_timeout=10&connect_timeout=10`
}

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
    transactionOptions: {
      maxWait: 5_000,
      timeout: 10_000,
    },
  })
}

const TRANSIENT_PRISMA_ERROR_CODES = new Set(["P1017", "P2024", "P2028", "P2034"])

const TRANSIENT_MESSAGE_PATTERNS = [
  "Transaction not found",
  "Transaction already closed",
  "Connection refused",
  "Connection reset",
  "Can't reach database server",
  "Timed out fetching a new connection",
  "server closed the connection",
  "Server has closed the connection",
]

export function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const code = (err as { code?: string }).code
  if (code && TRANSIENT_PRISMA_ERROR_CODES.has(code)) return true
  const message = (err as { message?: string }).message
  if (!message) return false
  return TRANSIENT_MESSAGE_PATTERNS.some((p) => message.includes(p))
}

const MAX_RETRIES = 1
const RETRY_BASE_MS = 100

export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  label: string = "prisma"
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation()
    } catch (err) {
      lastError = err
      if (!isTransientError(err) || attempt === MAX_RETRIES) {
        throw err
      }
      const delay = RETRY_BASE_MS * Math.pow(2, attempt)
      console.warn(
        `[prisma:${label}] Transient error (${(err as { code?: string }).code ?? "unknown"}), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

const RETRYABLE_MODEL_METHODS = new Set([
  "findUnique",
  "findFirst",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
])

const RETRYABLE_TOP_LEVEL = new Set(["$queryRaw", "$queryRawUnsafe", "$executeRaw", "$executeRawUnsafe"])

function isRetryableProperty(key: string | symbol): boolean {
  if (typeof key === "symbol") return false
  return RETRYABLE_MODEL_METHODS.has(key) || RETRYABLE_TOP_LEVEL.has(key)
}

function wrapWithRetry<T extends object>(target: T, modelLabel: string): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver)
      if (typeof value === "function" && typeof prop === "string" && isRetryableProperty(prop)) {
        return (...args: unknown[]) => {
          const label = `${modelLabel}:${prop}`
          return withPrismaRetry(
            () => (value as (...a: unknown[]) => unknown).apply(obj, args) as Promise<unknown>,
            label
          )
        }
      }
      return value
    },
  })
}

function createProxiedPrisma(base: PrismaClient): PrismaClient {
  return new Proxy(base, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver)
      if (value && typeof value === "object" && typeof prop === "string") {
        return wrapWithRetry(value, prop)
      }
      if (typeof value === "function" && typeof prop === "string" && isRetryableProperty(prop)) {
        return (...args: unknown[]) => {
          return withPrismaRetry(
            () => (value as (...a: unknown[]) => unknown).apply(obj, args) as Promise<unknown>,
            `$${prop}`
          )
        }
      }
      return value
    },
  }) as PrismaClient
}

const basePrisma =
  (globalForPrisma.prisma as ReturnType<typeof createPrismaClient> | undefined) ??
  createPrismaClient()

export const prisma = (globalForPrisma.prismaProxied as PrismaClient | undefined) ??
  createProxiedPrisma(basePrisma)

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma
  globalForPrisma.prismaProxied = prisma
}
