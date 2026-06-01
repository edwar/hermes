import { prisma } from '@/lib/prisma';

const FACTUS_API_URL = process.env.FACTUS_API_URL || 'https://api-sandbox.factus.com.co';
const CLIENT_ID = process.env.FACTUS_CLIENT_ID || '';
const CLIENT_SECRET = process.env.FACTUS_CLIENT_SECRET || '';
const USERNAME = process.env.FACTUS_USERNAME || '';
const PASSWORD = process.env.FACTUS_PASSWORD || '';

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
}

export class FactusApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'FactusApiError';
  }
}

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

export async function authenticate(companyId: string): Promise<string> {
  const stored = await getStoredTokens(companyId);

  if (stored?.factusAccessToken && stored.factusTokenExpiresAt) {
    const expiresAt = new Date(stored.factusTokenExpiresAt);
    if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return stored.factusAccessToken;
    }

    if (stored.factusRefreshToken) {
      try {
        const refreshed = await refreshAccessToken(stored.factusRefreshToken);
        return refreshed;
      } catch {
        // Token refresh failed, fall through to password grant
      }
    }
  }

  const token = await passwordGrant();
  await saveTokens(
    companyId,
    token.access_token,
    token.refresh_token,
    token.expires_in
  );
  return token.access_token;
}

async function passwordGrant(): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    username: USERNAME,
    password: PASSWORD,
  });

  const response = await fetch(`${FACTUS_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
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

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${FACTUS_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new FactusApiError(
      `Token refresh failed: ${response.statusText}`,
      response.status
    );
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

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
    : `${FACTUS_API_URL}${endpoint}`;

  const bodyData = options.body;
  const bodyString = typeof bodyData === 'string' ? bodyData : (bodyData ? JSON.stringify(bodyData) : undefined);

  const response = await fetch(url, {
    method: options.method || 'GET',
    body: bodyString,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const responseText = await response.text();

    let errorData: FactusError | null = null;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      // ignore parse errors
    }

    throw new FactusApiError(
      errorData?.message || `Factus API error: ${response.statusText}`,
      response.status,
      errorData?.details
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  const jsonResponse = await response.json();
  return jsonResponse;
}

export async function getInvoice(invoiceId: string, companyId: string) {
  return factusRequest<Record<string, unknown>>(
    `/v2/bills/${invoiceId}`,
    { method: 'GET' },
    companyId
  );
}

export async function getInvoicePdf(invoiceId: string, companyId: string): Promise<ArrayBuffer> {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const accessToken = await authenticate(companyId);

  const response = await fetch(`${FACTUS_API_URL}/v2/bills/${invoiceId}/download-pdf`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
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

export async function getInvoiceXml(invoiceId: string, companyId: string): Promise<ArrayBuffer> {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const accessToken = await authenticate(companyId);

  const response = await fetch(`${FACTUS_API_URL}/v2/bills/${invoiceId}/download-xml/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
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

  if (contentType.includes('application/json')) {
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
    { method: 'GET' },
    companyId
  );
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

export async function listNumberingRanges(companyId: string) {
  return factusRequest<{ data: NumberingRange[] }>(
    '/v2/numbering-ranges',
    { method: 'GET' },
    companyId
  );
}

export async function getNumberingRange(companyId: string, id: number) {
  return factusRequest<NumberingRange>(
    `/v2/numbering-ranges/${id}`,
    { method: 'GET' },
    companyId
  );
}

export async function getCompanyNumberingRanges(companyId: string) {
  const { prisma } = await import('@/lib/prisma');
  return prisma.companyNumberingRange.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getNumberingRangeByDocumentType(companyId: string, documentType: string) {
  const { prisma } = await import('@/lib/prisma');
  return prisma.companyNumberingRange.findUnique({
    where: {
      companyId_documentType: { companyId, documentType },
    },
  });
}

export async function createNumberingRange(
  companyId: string,
  data: { document: string; prefix: string; from: string; to: string; current: string }
) {
  return factusRequest<NumberingRange>(
    '/v2/numbering-ranges',
    { method: 'POST', body: JSON.stringify(data) },
    companyId
  );
}
