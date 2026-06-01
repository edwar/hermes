import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getInvoicePdf, getInvoiceXml, factusRequest, FactusApiError, getInvoice } from '@/lib/factus/client';
import type { InvoiceStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa' }, { status: 400 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const invoice = await prisma.electronicInvoice.findUnique({
      where: { id, companyId },
      include: { sale: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    if (!invoice.consecutive && !invoice.factusBillId) {
      return NextResponse.json({ error: 'Factura no tiene ID en Factus' }, { status: 400 });
    }

    const factusIdentifier = (invoice.consecutive || invoice.factusBillId)!;

    if (format === 'pdf') {
      const pdfBuffer = await getInvoicePdf(factusIdentifier, companyId);
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="factura-${invoice.consecutive || invoice.id}.pdf"`,
        },
      });
    }

    if (format === 'xml') {
      const xmlBuffer = await getInvoiceXml(factusIdentifier, companyId);
      return new NextResponse(xmlBuffer, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="factura-${invoice.consecutive || invoice.id}.xml"`,
        },
      });
    }

    const factusData = await getInvoice(factusIdentifier, companyId);

    return NextResponse.json({
      ...factusData,
      local: {
        id: invoice.id,
        cufe: invoice.cufe,
        consecutive: invoice.consecutive,
        status: invoice.status,
        total: invoice.total,
        taxTotal: invoice.taxTotal,
        validatedAt: invoice.validatedAt,
        acceptedAt: invoice.acceptedAt,
      },
    });
  } catch (error) {
    console.error('Get invoice error:', error);

    if (error instanceof FactusApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Error al obtener factura' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const invoice = await prisma.electronicInvoice.findUnique({
      where: { id, companyId },
      include: { sale: { include: { customer: true } } },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    if (!invoice.consecutive && !invoice.factusBillId) {
      return NextResponse.json({ error: 'Factura no tiene ID en Factus' }, { status: 400 });
    }

    const factusIdentifier = (invoice.consecutive || invoice.factusBillId)!;

    if (action === 'send-email') {
      const customerEmail = invoice.sale?.customer?.email || invoice.sale?.customer?.email;
      if (!customerEmail) {
        return NextResponse.json({ error: 'El cliente no tiene email' }, { status: 400 });
      }
      await factusRequest(
        `/v2/bills/${factusIdentifier}/send-email`,
        { method: 'POST', body: JSON.stringify({ email: customerEmail }) },
        companyId
      );
      return NextResponse.json({ success: true, message: 'Email enviado' });
    }

    if (action === 'refresh-status') {
      const factusData = await getInvoice(factusIdentifier, companyId) as { status?: string; data?: { status?: string; is_validated?: boolean }; errors?: Record<string, string> };

      const factusStatus = factusData.data?.status || factusData.status;
      const factusValidated = factusData.data?.is_validated;
      const isValidated = factusValidated === true || factusStatus === 'Created' || factusStatus === 'accepted';
      let newStatus: InvoiceStatus = invoice.status;

      if (isValidated) {
        newStatus = 'VALIDATED';
      } else if (factusData.errors && Object.values(factusData.errors).some(e => String(e).toLowerCase().includes('rechazo'))) {
        newStatus = 'REJECTED';
      }

      await prisma.electronicInvoice.update({
        where: { id },
        data: {
          status: newStatus,
          validatedAt: newStatus === 'VALIDATED' ? new Date() : undefined,
        },
      });

      return NextResponse.json({ success: true, status: newStatus, errors: factusData.errors });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Update invoice error:', error);

    if (error instanceof FactusApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Error al actualizar factura' }, { status: 500 });
  }
}