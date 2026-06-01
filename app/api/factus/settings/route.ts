import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authenticate, FactusApiError, getNumberingRangeByDocumentType } from '@/lib/factus/client';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.role === 'CASHIER') {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        factusEnabled: true,
        factusEconomicActivity: true,
        factusTokenExpiresAt: true,
        name: true,
        nit: true,
        address: true,
        email: true,
        phone: true,
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
      numberingRangeId: null,
      economicActivity: company.factusEconomicActivity,
      connected: hasValidToken,
      company: {
        name: company.name,
        nit: company.nit,
        address: company.address,
        email: company.email,
        phone: company.phone,
      },
    });
  } catch (error) {
    console.error('Get Factus settings error:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.role === 'CASHIER') {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa' }, { status: 400 });
    }

    const body = await req.json();
    const { enabled, validateAndEnable, testConnection } = body;

    if (validateAndEnable) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          name: true,
          nit: true,
          address: true,
          email: true,
          phone: true,
        },
      });

      if (!company) {
        return NextResponse.json({ valid: false, error: 'Empresa no encontrada' }, { status: 404 });
      }

      const errors: string[] = [];

      if (!company.name) errors.push('Nombre de empresa requerido');
      if (!company.nit) errors.push('NIT requerido');
      if (!company.address) errors.push('Dirección requerida');
      if (!company.email) errors.push('Email requerido');
      if (!company.phone) errors.push('Teléfono requerido');

      if (errors.length > 0) {
        return NextResponse.json({ valid: false, errors });
      }

      try {
        await authenticate(companyId);
      } catch (error) {
        if (error instanceof FactusApiError) {
          return NextResponse.json({ valid: false, error: `Error de Factus: ${error.message}` });
        }
        return NextResponse.json({ valid: false, error: 'Error al conectar con Factus' });
      }

      await prisma.company.update({
        where: { id: companyId },
        data: { factusEnabled: true },
      });

      return NextResponse.json({ valid: true, connected: true, enabled: true });
    }

    if (body.disconnect) {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          factusEnabled: false,
          factusAccessToken: null,
          factusRefreshToken: null,
          factusTokenExpiresAt: null,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (testConnection) {
      try {
        await authenticate(companyId);
        return NextResponse.json({ success: true, message: 'Conexión exitosa con Factus' });
      } catch (error) {
        if (error instanceof FactusApiError) {
          return NextResponse.json(
            { success: false, error: `Error de Factus: ${error.message}` },
            { status: error.statusCode }
          );
        }
        return NextResponse.json(
          { success: false, error: 'Error al conectar con Factus' },
          { status: 500 }
        );
      }
    }

    const data: Record<string, unknown> = {};

    if (typeof enabled === 'boolean') {
      data.factusEnabled = enabled;
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data,
      select: {
        factusEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      ...company,
    });
  } catch (error) {
    console.error('Update Factus settings error:', error);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}
