import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listNumberingRanges, getNumberingRange, createNumberingRange, FactusApiError } from '@/lib/factus/client';

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const range = await getNumberingRange(companyId, parseInt(id));
      return NextResponse.json(range);
    }

    const response = await listNumberingRanges(companyId);
    const ranges = response && typeof response === 'object' && 'data' in response ? response.data : [];
    return NextResponse.json({ data: Array.isArray(ranges) ? ranges : [] });
  } catch (error) {
    console.error('Numbering ranges error:', error);
    if (error instanceof FactusApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error al obtener rangos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const { document, prefix, current } = body;

    if (!document || !prefix) {
      return NextResponse.json({ error: 'document y prefix son requeridos' }, { status: 400 });
    }

    const range = await createNumberingRange(companyId, {
      document: document || '01',
      prefix: prefix || 'FD',
      current: current || '1',
    });

    await prisma.company.update({
      where: { id: companyId },
      data: { factusNumberingRangeId: range.id },
    });

    return NextResponse.json(range, { status: 201 });
  } catch (error) {
    console.error('Create numbering range error:', error);
    if (error instanceof FactusApiError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error al crear rango' }, { status: 500 });
  }
}