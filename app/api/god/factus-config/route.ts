import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { AUDIT_ACTION, USER_ROLE } from "@/lib/constants"
import {
  getFactusApiUrl,
  getPlatformConfigSummary,
  getPlatformCredentials,
  normalizeFactusUrl,
  savePlatformConfig,
} from "@/lib/factus/platform-config"

// Configuración de Factus de la plataforma: URL de la API y cuenta de pruebas. Solo el GOD.

async function requireGod() {
  const session = await auth()
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  if (session.user.role !== USER_ROLE.GOD) {
    return { error: NextResponse.json({ error: "Solo el administrador de plataforma puede ver esta configuración" }, { status: 403 }) }
  }
  return { session }
}

export async function GET() {
  const guard = await requireGod()
  if (guard.error) return guard.error
  // Nunca se devuelven los secretos: solo el Client ID, el usuario y si están configurados.
  return NextResponse.json(await getPlatformConfigSummary())
}

export async function PUT(req: NextRequest) {
  const guard = await requireGod()
  if (guard.error) return guard.error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })

  const { apiUrl, credentials } = body as {
    apiUrl?: unknown
    credentials?: { clientId?: unknown; clientSecret?: unknown; username?: unknown; password?: unknown }
  }

  if (apiUrl === undefined && credentials === undefined) {
    return NextResponse.json({ error: "No hay nada que guardar" }, { status: 400 })
  }

  let normalizedUrl: string | undefined
  if (apiUrl !== undefined) {
    if (typeof apiUrl !== "string") return NextResponse.json({ error: "URL inválida" }, { status: 400 })
    try {
      normalizedUrl = normalizeFactusUrl(apiUrl)
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
  }

  let creds: { clientId: string; clientSecret: string; username: string; password: string } | undefined
  if (credentials !== undefined) {
    const { clientId, clientSecret, username, password } = credentials ?? {}
    if (![clientId, clientSecret, username, password].every((v) => typeof v === "string" && v.trim())) {
      return NextResponse.json({ error: "Completa los cuatro campos de las credenciales" }, { status: 400 })
    }
    creds = {
      clientId: (clientId as string).trim(),
      clientSecret: clientSecret as string,
      username: (username as string).trim(),
      password: password as string,
    }
  }

  const { urlChanged } = await savePlatformConfig({ apiUrl: normalizedUrl, credentials: creds })

  await logAudit({
    userId: guard.session!.user.id,
    action: AUDIT_ACTION.FACTUS_CONFIG_UPDATED,
    entity: "SystemConfig",
    // Solo qué cambió, nunca los valores secretos.
    metadata: { apiUrl: normalizedUrl ?? null, credentialsUpdated: !!creds, urlChanged },
    req,
  })

  return NextResponse.json({ success: true, urlChanged, ...(await getPlatformConfigSummary()) })
}

/** Prueba la conexión: pide un token con la cuenta de pruebas contra la URL configurada. No guarda nada. */
export async function POST() {
  const guard = await requireGod()
  if (guard.error) return guard.error

  const platform = await getPlatformCredentials().catch(() => null)
  if (!platform) {
    return NextResponse.json({ success: false, error: "Configura primero las credenciales de la cuenta de pruebas" }, { status: 400 })
  }

  const url = await getFactusApiUrl()
  const c = platform.credentials
  try {
    const res = await fetch(`${url}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: c.clientId,
        client_secret: c.clientSecret,
        username: c.username,
        password: c.password,
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      return NextResponse.json(
        { success: false, error: `Factus rechazó las credenciales (${res.status}): ${detail.message ?? res.statusText}` },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: true, message: `Conexión exitosa con ${url}` })
  } catch (err) {
    return NextResponse.json({ success: false, error: `No se pudo contactar a Factus: ${(err as Error).message}` }, { status: 502 })
  }
}
