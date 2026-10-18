// =============================================================================
// CONFIGURACIÓN DE FACTUS A NIVEL DE PLATAFORMA (la edita solo el GOD)
//   - URL de la API: sandbox o producción. Aplica a todas las empresas.
//   - Credenciales de la cuenta de pruebas: respaldo para empresas sin credenciales
//     propias, y solo mientras la URL sea sandbox (ver getCredentials en client.ts).
// Todo vive en SystemConfig; los secretos se guardan cifrados (lib/crypto.ts). Ya no se
// leen variables de entorno FACTUS_*: la única fuente es esta configuración.
// =============================================================================

import { prisma } from '@/lib/prisma';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { normalizeFactusUrl, isSandboxUrl } from '@/lib/factus/url';

export { normalizeFactusUrl, isSandboxUrl };

export const DEFAULT_FACTUS_API_URL = 'https://api-sandbox.factus.com.co';
export const FACTUS_PRODUCTION_API_URL = 'https://api.factus.com.co';

const CATEGORY = 'factus';
const KEY = {
  apiUrl: 'api_url',
  clientId: 'client_id',
  clientSecret: 'client_secret_enc',
  username: 'username',
  password: 'password_enc',
} as const;

const LABEL: Record<string, string> = {
  [KEY.apiUrl]: 'URL de la API de Factus',
  [KEY.clientId]: 'Client ID de la cuenta de pruebas',
  [KEY.clientSecret]: 'Client Secret de la cuenta de pruebas (cifrado)',
  [KEY.username]: 'Usuario de la cuenta de pruebas',
  [KEY.password]: 'Contraseña de la cuenta de pruebas (cifrada)',
};

export interface PlatformCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

// --- Lectura con caché corta: se usa en cada llamada a Factus ---
const CACHE_TTL_MS = 30_000;
let cache: { at: number; values: Map<string, string> } | null = null;

export function clearPlatformConfigCache() {
  cache = null;
}

async function readAll(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.values;
  const rows = await prisma.systemConfig.findMany({ where: { category: CATEGORY, isActive: true } });
  const values = new Map(rows.map((r) => [r.key, r.value]));
  cache = { at: Date.now(), values };
  return values;
}

/** URL guardada por el GOD; si no hay ninguna, el sandbox. */
export async function getFactusApiUrl(): Promise<string> {
  try {
    const stored = (await readAll()).get(KEY.apiUrl);
    if (stored) return normalizeFactusUrl(stored);
  } catch (err) {
    console.error('[factus] No se pudo leer la URL guardada, se usa el sandbox:', err);
  }
  return DEFAULT_FACTUS_API_URL;
}

export async function isSandboxApi(): Promise<boolean> {
  return isSandboxUrl(await getFactusApiUrl());
}

export async function getPlatformCredentials(): Promise<PlatformCredentials | null> {
  const values = await readAll();
  const clientId = values.get(KEY.clientId);
  const secretEnc = values.get(KEY.clientSecret);
  const username = values.get(KEY.username);
  const passwordEnc = values.get(KEY.password);
  if (clientId && secretEnc && username && passwordEnc) {
    return { clientId, clientSecret: decryptSecret(secretEnc), username, password: decryptSecret(passwordEnc) };
  }
  return null;
}

/** Lo que ve la pantalla del GOD: nunca los secretos. */
export async function getPlatformConfigSummary() {
  const apiUrl = await getFactusApiUrl();
  const values = await readAll();
  const platform = await getPlatformCredentials().catch(() => null);
  return {
    apiUrl,
    urlSource: values.get(KEY.apiUrl) ? ('database' as const) : ('default' as const),
    sandbox: isSandboxUrl(apiUrl),
    credentials: {
      configured: !!platform,
      clientId: platform?.clientId ?? null,
      username: platform?.username ?? null,
    },
  };
}

async function upsert(key: string, value: string) {
  await prisma.systemConfig.upsert({
    where: { category_key: { category: CATEGORY, key } },
    update: { value, isActive: true },
    create: { category: CATEGORY, key, value, label: LABEL[key], isActive: true },
  });
}

export async function savePlatformConfig(input: { apiUrl?: string; credentials?: PlatformCredentials }) {
  let urlChanged = false;
  if (input.apiUrl !== undefined) {
    const next = normalizeFactusUrl(input.apiUrl);
    urlChanged = next !== (await getFactusApiUrl());
    await upsert(KEY.apiUrl, next);
  }
  if (input.credentials) {
    const c = input.credentials;
    await upsert(KEY.clientId, c.clientId.trim());
    await upsert(KEY.clientSecret, encryptSecret(c.clientSecret));
    await upsert(KEY.username, c.username.trim());
    await upsert(KEY.password, encryptSecret(c.password));
  }
  clearPlatformConfigCache();
  if (urlChanged) {
    // Los tokens de cada empresa son de la API anterior: se descartan para que se vuelvan a pedir.
    await prisma.company.updateMany({
      where: { factusAccessToken: { not: null } },
      data: { factusAccessToken: null, factusRefreshToken: null, factusTokenExpiresAt: null },
    });
  }
  return { urlChanged };
}
