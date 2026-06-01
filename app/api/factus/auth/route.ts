import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { authenticate, FactusApiError } from '@/lib/factus/client';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.role === 'CASHIER') {
      return NextResponse.json({ error: 'No tiene permisos para esta acción' }, { status: 403 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        nit: true,
        factusEnabled: true,
        factusAccessToken: true,
        factusTokenExpiresAt: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    if (!company.factusEnabled) {
      return NextResponse.json({ error: 'Facturación electrónica no habilitada' }, { status: 400 });
    }

    const token = await authenticate(companyId);

    return NextResponse.json({
      success: true,
      message: 'Conexión con Factus exitosa',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Factus auth error:', error);

    if (error instanceof FactusApiError) {
      return NextResponse.json(
        { error: `Error de Factus: ${error.message}` },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Error al conectar con Factus' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
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
        factusEconomicActivity: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const isConnected = !!company.factusEnabled && !!company.factusTokenExpiresAt;
    const isExpired = company.factusTokenExpiresAt
      ? new Date(company.factusTokenExpiresAt) < new Date()
      : true;

    return NextResponse.json({
      enabled: company.factusEnabled,
      connected: isConnected && !isExpired,
      expired: isExpired,
      numberingRangeId: null,
      economicActivity: company.factusEconomicActivity,
    });
  } catch (error) {
    console.error('Factus status error:', error);
    return NextResponse.json(
      { error: 'Error al verificar estado de Factus' },
      { status: 500 }
    );
  }
}
