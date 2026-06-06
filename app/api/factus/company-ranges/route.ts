import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listNumberingRanges, FactusApiError } from '@/lib/factus/client';

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

    // Obtener los rangos guardados de la empresa en nuestra base de datos
    const savedRanges = await prisma.companyNumberingRange.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    // Obtener el estado actual desde la API de Factus
    let factusRanges: any[] = [];
    try {
      const response = await listNumberingRanges(companyId);
      factusRanges = (response as any)?.data || [];
    } catch {
      // Ignorar errores de la API de Factus aquí
    }

    // Combinar los rangos guardados con los datos actuales de Factus
    const rangesWithStatus = savedRanges.map((sr) => {
      const fr = factusRanges.find((fr: any) => fr.id === sr.factusRangeId);
      return {
        id: sr.id,
        documentType: sr.documentType,
        factusRangeId: sr.factusRangeId,
        prefix: sr.prefix,
        current: fr?.current || '?',
        from: fr?.from || '?',
        to: fr?.to || '?',
        isActive: fr?.is_active === 1,
        isExpired: fr?.is_expired === 1,
        createdAt: sr.createdAt,
      };
    });

    return NextResponse.json({ ranges: rangesWithStatus });
  } catch (error) {
    console.error('Company ranges error:', error);
    return NextResponse.json({ error: 'Error al obtener rangos' }, { status: 500 });
  }
}
