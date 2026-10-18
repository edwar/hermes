import { NextRequest, NextResponse } from 'next/server';
import { guardModule } from '@/lib/permissions/guard';
import { prisma } from '@/lib/prisma';
import { FactusApiError, listInvoices } from '@/lib/factus/client';
import { emitCreditNoteForReturn, emitInvoiceForSale } from '@/lib/invoicing/emit';
import type { InvoiceStatus } from '@prisma/client';
import { FACTUS_INVOICE_TYPE, SORT_DIRECTION } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const guard = await guardModule('/electronic-invoices');
    if ('error' in guard) return guard.error;
    const { session } = guard;

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20');
    const status = searchParams.get('status') ?? undefined;

    let where: Record<string, unknown> = { companyId };
    if (status) {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      prisma.electronicInvoice.findMany({
        where,
        include: {
          sale: {
            include: {
              customer: true,
              user: true,
            },
          },
        },
        orderBy: { createdAt: SORT_DIRECTION.DESC },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.electronicInvoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      total,
      pages: Math.ceil(total / pageSize),
      page,
    });
  } catch (error) {
    console.error('List invoices error:', error);
    return NextResponse.json({ error: 'Error al listar facturas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await guardModule('/electronic-invoices/manage');
    if ('error' in guard) return guard.error;
    const { session } = guard;

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa' }, { status: 400 });
    }

    const body = await req.json();
    const { saleId, isReturn } = body;

    if (!saleId) {
      return NextResponse.json({ error: 'saleId es requerido' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        factusEnabled: true,
        factusBlocked: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    if (!company.factusEnabled) {
      return NextResponse.json({ error: 'Facturación electrónica no habilitada' }, { status: 400 });
    }

    if (company.factusBlocked) {
      return NextResponse.json({ error: 'Facturación electrónica bloqueada para esta empresa' }, { status: 403 });
    }

    // Facturas y notas crédito se emiten (o se reintentan) con el servicio idempotente.
    // Para una nota crédito, `saleId` es el de la venta de devolución.
    const result = isReturn
      ? await emitCreditNoteForReturn(saleId, companyId, session.user.id)
      : await emitInvoiceForSale(saleId, companyId, session.user.id);

    return NextResponse.json({
      success: result.status === 'VALIDATED' || result.status === 'ACCEPTED',
      type: isReturn ? FACTUS_INVOICE_TYPE.CREDIT_NOTE : FACTUS_INVOICE_TYPE.INVOICE,
      ...result,
    });
  } catch (error) {
    console.error('Create invoice error:', error);

    if (error instanceof FactusApiError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Error al crear factura electrónica' },
      { status: 500 }
    );
  }
}
