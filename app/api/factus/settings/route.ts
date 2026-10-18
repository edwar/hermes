import { NextRequest, NextResponse } from 'next/server';
import { guardModule } from '@/lib/permissions/guard';
import { prisma } from '@/lib/prisma';
import { authenticate, FactusApiError, FactusNotConfiguredError, getNumberingRangeByDocumentType } from '@/lib/factus/client';
import { encryptSecret } from '@/lib/crypto';

export async function GET() {
  try {
    const guard = await guardModule('/settings');
    if ('error' in guard) return guard.error;
    const { session } = guard;

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
        factusClientId: true,
        factusClientSecretEnc: true,
        factusUsername: true,
        factusPasswordEnc: true,
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
      credentials: {
        configured: Boolean(
          company.factusClientId && company.factusClientSecretEnc && company.factusUsername && company.factusPasswordEnc
        ),
        clientId: company.factusClientId,
        username: company.factusUsername,
      },
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
    const guard = await guardModule('/settings');
    if ('error' in guard) return guard.error;
    const { session } = guard;

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa' }, { status: 400 });
    }

    const body = await req.json();
    const { enabled, validateAndEnable, testConnection, credentials } = body;

    if (credentials) {
      const { clientId, clientSecret, username, password } = credentials as Record<string, unknown>;
      const fields = [clientId, clientSecret, username, password];
      if (!fields.every((f) => typeof f === 'string' && f.trim().length > 0)) {
        return NextResponse.json({ success: false, error: 'Todos los campos de credenciales son requeridos' }, { status: 400 });
      }

      try {
        await prisma.company.update({
          where: { id: companyId },
          data: {
            factusClientId: (clientId as string).trim(),
            factusClientSecretEnc: encryptSecret((clientSecret as string).trim()),
            factusUsername: (username as string).trim(),
            factusPasswordEnc: encryptSecret(password as string),
            // Credenciales nuevas invalidan los tokens y obligan a reconectar.
            factusAccessToken: null,
            factusRefreshToken: null,
            factusTokenExpiresAt: null,
            factusEnabled: false,
          },
        });
      } catch (error) {
        console.error('Save Factus credentials error:', error);
        return NextResponse.json({ success: false, error: 'No se pudieron guardar las credenciales' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

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
        if (error instanceof FactusNotConfiguredError) {
          return NextResponse.json({ valid: false, error: 'Configura primero las credenciales de Factus de la empresa' });
        }
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
        if (error instanceof FactusNotConfiguredError) {
          return NextResponse.json(
            { success: false, error: 'Configura primero las credenciales de Factus de la empresa' },
            { status: 400 }
          );
        }
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
