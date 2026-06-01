import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { factusRequest, FactusApiError, listInvoices, getNumberingRangeByDocumentType } from '@/lib/factus/client';
import { mapSaleToFactusInvoice, mapSaleToFactusCreditNote } from '@/lib/factus/mappers';
import type { InvoiceStatus } from '@prisma/client';

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
        orderBy: { createdAt: 'desc' },
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

    const body = await req.json();
    const { saleId, isReturn, correctionConceptId } = body;

    if (!saleId) {
      return NextResponse.json({ error: 'saleId es requerido' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        factusEnabled: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    if (!company.factusEnabled) {
      return NextResponse.json({ error: 'Facturación electrónica no habilitada' }, { status: 400 });
    }

    const documentType = isReturn ? '22' : '21';
    const rangeRecord = await getNumberingRangeByDocumentType(companyId, documentType);

    if (!rangeRecord) {
      return NextResponse.json({ error: `Rango de numeración para ${isReturn ? 'nota crédito' : 'factura'} no configurado` }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId, companyId },
      include: {
        items: { include: { product: true } },
        customer: true,
        company: true,
        electronicInvoice: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    if (isReturn && !sale.electronicInvoice) {
      return NextResponse.json(
        { error: 'La venta original no tiene factura electrónica' },
        { status: 400 }
      );
    }

    if (sale.electronicInvoice && sale.electronicInvoice.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Esta venta ya tiene una factura electrónica válida' },
        { status: 400 }
      );
    }

    let factusPayload;
    let endpoint: string;
    let invoiceType: 'invoice' | 'credit-note' = 'invoice';

    if (isReturn) {
      const originalInvoice = sale.electronicInvoice;
      if (!originalInvoice?.cufe) {
        return NextResponse.json(
          { error: 'La factura original no tiene CUFE' },
          { status: 400 }
        );
      }

      factusPayload = await mapSaleToFactusCreditNote(
        sale,
        originalInvoice.consecutive || '',
        rangeRecord.factusRangeId,
        `return-${sale.id.slice(0, 8)}-${Date.now()}`,
        correctionConceptId || '1'
      );
      endpoint = '/v2/credit-notes/validate';
      invoiceType = 'credit-note';
    } else {
      factusPayload = await mapSaleToFactusInvoice(sale, rangeRecord.factusRangeId, `sale-${sale.id.slice(0, 8)}-${Date.now()}`);
      endpoint = '/v2/bills/validate';
    }

    const factusResponse = await factusRequest<{
      id: number;
      consecutive: string;
      cufe: string;
      qr_code: string;
      status: string;
      created_at: string;
      links?: { rel: string; href: string }[];
    }>(endpoint, { method: 'POST', body: factusPayload as any }, companyId);

    const invoiceStatus: InvoiceStatus =
      factusResponse.status === 'accepted' || factusResponse.status === 'validated'
        ? 'VALIDATED'
        : 'PENDING';

    await prisma.electronicInvoice.upsert({
      where: { saleId: sale.id },
      create: {
        companyId,
        saleId: sale.id,
        cufe: factusResponse.cufe,
        consecutive: factusResponse.consecutive,
        status: invoiceStatus,
        factusBillId: String(factusResponse.id),
        total: sale.total,
        taxTotal: sale.tax,
        validatedAt: invoiceStatus === 'VALIDATED' ? new Date() : null,
      },
      update: {
        cufe: factusResponse.cufe,
        consecutive: factusResponse.consecutive,
        status: invoiceStatus,
        factusBillId: String(factusResponse.id),
        validatedAt: invoiceStatus === 'VALIDATED' ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      invoiceId: factusResponse.id,
      consecutive: factusResponse.consecutive,
      cufe: factusResponse.cufe,
      status: invoiceStatus,
      type: invoiceType,
      qrCode: factusResponse.qr_code,
      links: factusResponse.links,
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
