import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getInvoicePdf, getInvoiceXml, factusRequest, FactusApiError, getInvoice } from '@/lib/factus/client';
import { mapSaleToFactusInvoice } from '@/lib/factus/mappers';
import { getNumberingRangeByDocumentType } from '@/lib/factus/client';
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

    if (action === 'delete-pending') {
      if (!invoice.referenceCode) {
        return NextResponse.json(
          { error: 'La factura no tiene referenceCode; no se puede limpiar en Factus' },
          { status: 400 }
        );
      }

      try {
        await factusRequest(
          `/v2/bills/destroy/reference/${encodeURIComponent(invoice.referenceCode)}`,
          { method: 'DELETE' },
          companyId
        );
      } catch (error) {
        if (error instanceof FactusApiError && error.statusCode === 404) {
          // Already cleared in Factus, treat as success
        } else {
          throw error;
        }
      }

      await prisma.electronicInvoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          errorMessage: 'Limpiada de la cola pendiente de Factus',
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'resend') {
      const sale = await prisma.sale.findUnique({
        where: { id: invoice.saleId! },
        include: {
          items: { include: { product: true } },
          customer: true,
          company: true,
        },
      });

      if (!sale) {
        return NextResponse.json({ error: 'Venta asociada no encontrada' }, { status: 404 });
      }

      if (invoice.referenceCode) {
        try {
          await factusRequest(
            `/v2/bills/destroy/reference/${encodeURIComponent(invoice.referenceCode)}`,
            { method: 'DELETE' },
            companyId
          );
        } catch (error) {
          if (!(error instanceof FactusApiError && error.statusCode === 404)) {
            throw error;
          }
        }
      }

      const rangeRecord = await getNumberingRangeByDocumentType(companyId, '21');
      const numberingRangeId = rangeRecord?.factusRangeId;
      const newReferenceCode = `sale-${sale.id.slice(0, 8)}-${Date.now()}`;

      const payload = await mapSaleToFactusInvoice(
        sale as any,
        numberingRangeId,
        newReferenceCode
      );

      const factusResponse = await factusRequest<{
        id: number;
        consecutive: string;
        cufe: string;
        status: string;
      }>(
        '/v2/bills/validate',
        { method: 'POST', body: JSON.stringify(payload) },
        companyId
      );

      const responseData: { data?: { is_validated?: boolean; number?: string; cufe?: string; consecutive?: string; id?: number }; is_validated?: boolean; number?: string; cufe?: string; consecutive?: string; id?: number } = factusResponse;
      const inner = responseData.data ?? responseData;
      const isValidated = inner.is_validated === true || factusResponse.status === 'Created' || factusResponse.status === 'accepted';
      const factusBillId = inner.number || factusResponse.consecutive || String(inner.id || invoice.factusBillId || 'unknown');

      const newStatus: InvoiceStatus = isValidated ? 'VALIDATED' : 'PENDING';

      await prisma.electronicInvoice.update({
        where: { id },
        data: {
          cufe: responseData.cufe || factusResponse.cufe,
          consecutive: responseData.number || factusResponse.consecutive,
          status: newStatus,
          factusBillId,
          referenceCode: newReferenceCode,
          validatedAt: newStatus === 'VALIDATED' ? new Date() : null,
          errorMessage: null,
        },
      });

      return NextResponse.json({
        success: true,
        status: newStatus,
        consecutive: responseData.number || factusResponse.consecutive,
      });
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