// =============================================================================
// CLIENTE HTTP DE FACTUS — COMUNICACIÓN CON LA API DE FACTUS (DIAN)
// Factus es un Proveedor Tecnológico (PROV) autorizado por DIAN para la
// facturación electrónica en Colombia. Este archivo contiene:
//   1. Autenticación OAuth2 (password grant + refresh token)
//   2. Cliente HTTP genérico (factusRequest) para cualquier endpoint
//   3. Funciones específicas: facturas, notas crédito, rangos, eventos RADIAN
// =============================================================================

import { prisma } from '@/lib/prisma';
import { HTTP_METHOD, CONTENT_TYPE, HEADER_NAME } from '@/lib/constants';

import { decryptSecret } from '@/lib/crypto';
import { getFactusApiUrl, getPlatformCredentials, isSandboxApi } from '@/lib/factus/platform-config';

// Factus asigna una cuenta por NIT emisor, así que las credenciales viven en
// cada Company. La cuenta de pruebas de la plataforma (la configura el GOD)
// solo sirve como respaldo en sandbox; en producción
// nunca se usa, para no emitir facturas de un comercio bajo la cuenta de otro.
interface FactusCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export class FactusNotConfiguredError extends Error {
  constructor(message = 'La empresa no tiene credenciales de Factus configuradas') {
    super(message);
    this.name = 'FactusNotConfiguredError';
  }
}

async function getCredentials(companyId: string): Promise<FactusCredentials> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      factusClientId: true,
      factusClientSecretEnc: true,
      factusUsername: true,
      factusPasswordEnc: true,
    },
  });

  if (
    company?.factusClientId &&
    company.factusClientSecretEnc &&
    company.factusUsername &&
    company.factusPasswordEnc
  ) {
    return {
      clientId: company.factusClientId,
      clientSecret: decryptSecret(company.factusClientSecretEnc),
      username: company.factusUsername,
      password: decryptSecret(company.factusPasswordEnc),
    };
  }

  if (await isSandboxApi()) {
    const platform = await getPlatformCredentials();
    if (platform) return platform;
  }

  throw new FactusNotConfiguredError();
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface FactusError {
  error: string;
  message: string;
  details?: Record<string, string[]>;
  data?: {
    message?: string;
    errors?: Record<string, unknown>;
  };
}

// --- Error personalizado para la API de Factus ---
// Incluye statusCode, detalles de validación y el payload completo de error
export class FactusApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: Record<string, string[]>,
    public factusData?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'FactusApiError';
  }
}

// =============================================================================
// AUTENTICACIÓN OAUTH2
// Factus usa OAuth2 con grant_type=password para obtener un access token.
// Los tokens se almacenan en la tabla Company y se refrescan automáticamente
// cuando están por expirar.
// =============================================================================

async function getStoredTokens(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      factusAccessToken: true,
      factusRefreshToken: true,
      factusTokenExpiresAt: true,
    },
  });
  return company;
}

async function saveTokens(
  companyId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  await prisma.company.update({
    where: { id: companyId },
    data: {
      factusAccessToken: accessToken,
      factusRefreshToken: refreshToken,
      factusTokenExpiresAt: expiresAt,
    },
  });
}

// --- Autenticar (o reusar token existente) ---
// 1. Si hay token guardado y no ha expirado (>5 min de margen), lo reusa
// 2. Si hay refresh token, intenta refrescar
// 3. Si todo falla, hace login completo con usuario/contraseña
export async function authenticate(companyId: string): Promise<string> {
  const stored = await getStoredTokens(companyId);

  if (stored?.factusAccessToken && stored.factusTokenExpiresAt) {
    const expiresAt = new Date(stored.factusTokenExpiresAt);
    if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return stored.factusAccessToken;
    }

    if (stored.factusRefreshToken) {
      try {
        const credentials = await getCredentials(companyId);
        const refreshed = await refreshAccessToken(credentials, stored.factusRefreshToken);
        await saveTokens(
          companyId,
          refreshed.access_token,
          refreshed.refresh_token ?? stored.factusRefreshToken,
          refreshed.expires_in
        );
        return refreshed.access_token;
      } catch {
        // Falló la renovación del token, continuar con el grant por contraseña
      }
    }
  }

  const token = await passwordGrant(await getCredentials(companyId));
  await saveTokens(
    companyId,
    token.access_token,
    token.refresh_token,
    token.expires_in
  );
  return token.access_token;
}

// --- Login con usuario/contraseña (password grant) ---
async function passwordGrant(credentials: FactusCredentials): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    username: credentials.username,
    password: credentials.password,
  });

  const response = await fetch(`${await getFactusApiUrl()}/oauth/token`, {
    method: HTTP_METHOD.POST,
    headers: {
      [HEADER_NAME.CONTENT_TYPE]: CONTENT_TYPE.FORM_URLENCODED,
      [HEADER_NAME.ACCEPT]: CONTENT_TYPE.JSON,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new FactusApiError(
      `Authentication failed: ${error.message || response.statusText}`,
      response.status
    );
  }

  return response.json();
}

// --- Refrescar token (refresh grant) ---
async function refreshAccessToken(credentials: FactusCredentials, refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${await getFactusApiUrl()}/oauth/token`, {
    method: HTTP_METHOD.POST,
    headers: {
      [HEADER_NAME.CONTENT_TYPE]: CONTENT_TYPE.FORM_URLENCODED,
      [HEADER_NAME.ACCEPT]: CONTENT_TYPE.JSON,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new FactusApiError(
      `Token refresh failed: ${response.statusText}`,
      response.status
    );
  }

  return response.json();
}

// =============================================================================
// CLIENTE HTTP GENÉRICO
// factusRequest() es la función base para todas las llamadas a Factus.
// Automáticamente:
//   1. Autentica (obtiene token)
//   2. Agrega headers (Authorization Bearer, Content-Type)
//   3. Maneja errores (los parsea y lanza FactusApiError)
// =============================================================================

export async function factusRequest<T = unknown>(
  endpoint: string,
  options: RequestInit & { body?: object | string },
  companyId?: string
): Promise<T> {
  if (!companyId) {
    throw new Error('companyId is required for Factus API requests');
  }

  const accessToken = await authenticate(companyId);

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${await getFactusApiUrl()}${endpoint}`;

  const bodyData = options.body;
  const bodyString = typeof bodyData === 'string' ? bodyData : (bodyData ? JSON.stringify(bodyData) : undefined);

  const response = await fetch(url, {
    method: options.method || HTTP_METHOD.GET,
    body: bodyString,
    headers: {
      [HEADER_NAME.AUTHORIZATION]: `Bearer ${accessToken}`,
      [HEADER_NAME.CONTENT_TYPE]: CONTENT_TYPE.JSON,
      [HEADER_NAME.ACCEPT]: CONTENT_TYPE.JSON,
    },
  });

  if (!response.ok) {
    const responseText = await response.text();

    let errorData: FactusError | null = null;
    try {
      errorData = JSON.parse(responseText);
    } catch {
    }

    throw new FactusApiError(
      errorData?.message || `Factus API error: ${response.statusText}`,
      response.status,
      errorData?.details,
      errorData as unknown as Record<string, unknown>,
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  const jsonResponse = await response.json();
  return jsonResponse;
}

// =============================================================================
// FUNCIONES ESPECÍFICAS DE LA API DE FACTUS
// =============================================================================

// --- Obtener una factura o nota crédito desde Factus por su ID/número ---
export async function getInvoice(invoiceId: string, companyId: string, isCreditNote?: boolean) {
  return factusRequest<Record<string, unknown>>(
    isCreditNote ? `/v2/credit-notes/${invoiceId}` : `/v2/bills/${invoiceId}`,
    { method: HTTP_METHOD.GET },
    companyId
  );
}

// --- Descargar PDF de una factura/nota crédito (viene en base64 desde Factus) ---
export async function getInvoicePdf(invoiceId: string, companyId: string, isCreditNote?: boolean): Promise<ArrayBuffer> {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const accessToken = await authenticate(companyId);

  const response = await fetch(`${await getFactusApiUrl()}/${isCreditNote ? 'v2/credit-notes' : 'v2/bills'}/${invoiceId}/download-pdf`, {
    method: HTTP_METHOD.GET,
    headers: {
      [HEADER_NAME.AUTHORIZATION]: `Bearer ${accessToken}`,
      [HEADER_NAME.ACCEPT]: CONTENT_TYPE.JSON,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new FactusApiError(
      `Failed to download PDF: ${response.statusText} - ${errorText}`,
      response.status
    );
  }

  const data = await response.json();
  const pdfBase64 = data.data?.pdf_base_64_encoded || data.pdf_base_64_encoded;

  if (!pdfBase64) {
    throw new FactusApiError('No PDF data in response', 500);
  }

  const buffer = Buffer.from(pdfBase64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

// --- Descargar XML de una factura/nota crédito (formato DIAN estándar) ---
export async function getInvoiceXml(invoiceId: string, companyId: string, isCreditNote?: boolean): Promise<ArrayBuffer> {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const accessToken = await authenticate(companyId);

  const response = await fetch(`${await getFactusApiUrl()}/${isCreditNote ? 'v2/credit-notes' : 'v2/bills'}/${invoiceId}/download-xml/`, {
    method: HTTP_METHOD.GET,
    headers: {
      [HEADER_NAME.AUTHORIZATION]: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new FactusApiError(
      `Failed to download XML: ${response.statusText}`,
      response.status
    );
  }

  const contentType = response.headers.get('content-type') || '';
  let xmlContent: string;

  if (contentType.includes(CONTENT_TYPE.JSON)) {
    const data = await response.json();
    xmlContent = data.data?.xml_base_64_encoded || data.xml_base_64_encoded;
    if (xmlContent) {
      xmlContent = Buffer.from(xmlContent, 'base64').toString('utf-8');
    }
  } else {
    xmlContent = await response.text();
  }

  if (!xmlContent) {
    throw new FactusApiError('No XML data in response', 500);
  }

  return new TextEncoder().encode(xmlContent).buffer;
}

// --- Listar facturas desde Factus (con filtros de paginación y fechas) ---
export async function listInvoices(
  companyId: string,
  params: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
    state?: string;
  } = {}
) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.per_page) query.set('per_page', String(params.per_page));
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  if (params.state) query.set('state', params.state);

  return factusRequest<{
    data: Record<string, unknown>[];
    meta: { total: number; page: number; per_page: number };
  }>(
    `/v2/bills?${query.toString()}`,
    { method: HTTP_METHOD.GET },
    companyId
  );
}

export interface FactusListResponse<T = Record<string, unknown>> {
  data: T[];
  meta?: { total?: number; page?: number; per_page?: number };
}

interface FactusEnvelope<T> {
  status?: string;
  message?: string;
  data?: T;
}

interface PendingBill {
  id?: number;
  number?: string;
  reference_code?: string;
  status?: string;
  is_validated?: boolean;
  created_at?: string;
  customer?: { names?: string; identification?: string };
  total?: string;
  errors?: Record<string, string>;
}

// --- Helper para "aplanar" la respuesta de Factus (maneja distintos formatos de respuesta) ---
async function unwrapList<T>(raw: FactusEnvelope<FactusListResponse<T>> | T[]): Promise<T[]> {
  if (Array.isArray(raw)) return raw
  const inner = raw?.data
  if (Array.isArray(inner)) return inner as T[]
  if (inner && typeof inner === 'object' && Array.isArray((inner as FactusListResponse<T>).data)) {
    return (inner as FactusListResponse<T>).data
  }
  return []
}

// --- Listar facturas pendientes (status=0) en Factus ---
// Se usa antes de crear una nueva FE para limpiar la cola de pendientes
export async function listPendingBills(companyId: string): Promise<PendingBill[]> {
  const query = new URLSearchParams();
  query.set('filter[status]', '0');
  query.set('per_page', '50');
  const raw = await factusRequest<FactusEnvelope<FactusListResponse<PendingBill>> | PendingBill[]>(
    `/v2/bills?${query.toString()}`,
    { method: HTTP_METHOD.GET },
    companyId
  );
  return unwrapList<PendingBill>(raw)
}

// --- Listar notas crédito pendientes (status=0) en Factus ---
export async function listPendingCreditNotes(companyId: string): Promise<PendingBill[]> {
  const query = new URLSearchParams();
  query.set('filter[status]', '0');
  query.set('per_page', '50');
  const raw = await factusRequest<FactusEnvelope<FactusListResponse<PendingBill>> | PendingBill[]>(
    `/v2/credit-notes?${query.toString()}`,
    { method: HTTP_METHOD.GET },
    companyId
  );
  return unwrapList<PendingBill>(raw)
}

interface NumberingRange {
  id: number;
  document: string;
  document_name: string;
  prefix: string;
  from: number;
  to: number;
  current: number;
  resolution_number: string;
  start_date: string;
  end_date: string;
  technical_key: string;
  is_expired: number;
  is_active: number;
}

// --- Listar rangos de numeración desde Factus ---
// Los rangos de numeración son asignados por DIAN y definen el prefijo,
// rango numérico, resolución y vigencia para facturas/notas crédito.
export async function listNumberingRanges(companyId: string, filters?: { document?: string; isActive?: boolean }) {
  const query = new URLSearchParams();
  if (filters?.document) query.set('filter[document]', filters.document);
  if (filters?.isActive !== undefined) query.set('filter[is_active]', filters.isActive ? '1' : '0');
  const qs = query.toString();

  return factusRequest<FactusEnvelope<{ data: NumberingRange[]; pagination?: Record<string, unknown> }>>(
    `/v2/numbering-ranges${qs ? `?${qs}` : ''}`,
    { method: HTTP_METHOD.GET },
    companyId
  );
}

// --- Obtener el rango de numeración activo para un tipo de documento ---
// Document type "21" = Factura Electrónica, "22" = Nota Crédito
export async function getActiveNumberingRangeByDocument(companyId: string, document: string) {
  const raw = await listNumberingRanges(companyId, { document, isActive: true });
  const inner = raw?.data;
  const ranges = Array.isArray(inner) ? inner : (inner as any)?.data ?? [];
  if (ranges.length === 0) return null;
  return ranges[0] as NumberingRange;
}

// --- Obtener un rango de numeración específico por ID ---
export async function getNumberingRange(companyId: string, id: number) {
  return factusRequest<NumberingRange>(
    `/v2/numbering-ranges/${id}`,
    { method: HTTP_METHOD.GET },
    companyId
  );
}

// --- Obtener rangos de numeración guardados localmente en nuestra DB ---
export async function getCompanyNumberingRanges(companyId: string) {
  const { prisma } = await import('@/lib/prisma');
  return prisma.companyNumberingRange.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  });
}

// --- Obtener el rango de numeración local para un tipo de documento específico ---
export async function getNumberingRangeByDocumentType(companyId: string, documentType: string) {
  const { prisma } = await import('@/lib/prisma');
  return prisma.companyNumberingRange.findUnique({
    where: {
      companyId_documentType: { companyId, documentType },
    },
  });
}

// --- Enviar un evento RADIAN a Factus ---
// RADIAN es el sistema de la DIAN para registro de eventos (aceptación,
// rechazo, etc.). El evento "033" es "Aceptación Expresa".
export async function sendRadianEvent(
  billNumber: string,
  eventType: string,
  companyId: string,
  body?: Record<string, unknown>
) {
  return factusRequest<Record<string, unknown>>(
    `/v2/bills/${encodeURIComponent(billNumber)}/radian/events/${eventType}`,
    { method: HTTP_METHOD.POST, body: body ?? {} } as any,
    companyId
  );
}

// --- Crear un nuevo rango de numeración en Factus ---
export async function createNumberingRange(
  companyId: string,
  data: { document: string; prefix: string; from: string; to: string; current: string }
) {
  return factusRequest<NumberingRange>(
    '/v2/numbering-ranges',
    { method: HTTP_METHOD.POST, body: JSON.stringify(data) },
    companyId
  );
}
