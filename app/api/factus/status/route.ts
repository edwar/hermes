import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        factusEnabled: true,
        factusTokenExpiresAt: true,
        factusClientId: true,
        factusClientSecretEnc: true,
        factusUsername: true,
        factusPasswordEnc: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const hasValidToken = company.factusTokenExpiresAt
      ? new Date(company.factusTokenExpiresAt) > new Date()
      : false;

    return NextResponse.json({
      enabled: company.factusEnabled,
      connected: company.factusEnabled && hasValidToken,
      credentialsConfigured: Boolean(
        company.factusClientId && company.factusClientSecretEnc && company.factusUsername && company.factusPasswordEnc
      ),
    });
  } catch (error) {
    console.error('Get Factus status error:', error);
    return NextResponse.json({ error: 'Error al verificar estado de Factus' }, { status: 500 });
  }
}
