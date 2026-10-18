import { NextResponse } from 'next/server';
import { guardModule } from '@/lib/permissions/guard';
import { prisma } from '@/lib/prisma';
import { listNumberingRanges, FactusApiError } from '@/lib/factus/client';
import { SORT_DIRECTION } from '@/lib/constants';

export async function GET() {
  try {
    const guard = await guardModule('/settings');
    if ('error' in guard) return guard.error;
    const { session } = guard;

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa' }, { status: 400 });
    }

    // Obtener los rangos guardados de la empresa en nuestra base de datos
    const savedRanges = await prisma.companyNumberingRange.findMany({
      where: { companyId },
      orderBy: { createdAt: SORT_DIRECTION.DESC },
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
