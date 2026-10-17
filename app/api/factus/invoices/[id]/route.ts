import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getInvoicePdf, getInvoiceXml, factusRequest, FactusApiError, getInvoice } from '@/lib/factus/client';
import type { InvoiceStatus } from '@prisma/client';
import { HTTP_METHOD, HEADER_NAME, AUDIT_ACTION } from '@/lib/constants';
import { logAudit } from '@/lib/audit';
import { emitCreditNoteForReturn, emitInvoiceForSale } from '@/lib/invoicing/emit';
import { getProvider } from '@/lib/invoicing';

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
    const isCreditNote = invoice.sale?.isReturn === true;

    if (format === 'pdf') {
      const pdfBuffer = await getInvoicePdf(factusIdentifier, companyId, isCreditNote);
      return new NextResponse(pdfBuffer, {
        headers: {
          [HEADER_NAME.CONTENT_TYPE]: 'application/pdf',
          [HEADER_NAME.CONTENT_DISPOSITION]: `attachment; filename="factura-${invoice.consecutive || invoice.id}.pdf"`,
        },
      });
    }

    if (format === 'xml') {
      const xmlBuffer = await getInvoiceXml(factusIdentifier, companyId, isCreditNote);
      return new NextResponse(xmlBuffer, {
        headers: {
          [HEADER_NAME.CONTENT_TYPE]: 'application/xml',
          [HEADER_NAME.CONTENT_DISPOSITION]: `attachment; filename="factura-${invoice.consecutive || invoice.id}.xml"`,
        },
      });
    }

    const factusData = await getInvoice(factusIdentifier, companyId, isCreditNote);

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

    // Acciones sobre documentos que aún no tienen número en Factus: van antes de
    // la validación de ID de más abajo.
    if (action === 'resend') {
      if (invoice.status !== 'PENDING' && invoice.status !== 'REJECTED') {
        return NextResponse.json({ error: 'Solo se pueden reintentar documentos pendientes o rechazados' }, { status: 400 });
      }
      if (!invoice.saleId) {
        return NextResponse.json({ error: 'El documento no tiene venta asociada' }, { status: 400 });
      }

      // Reintento idempotente: mismo reference_code, así Factus devuelve el documento
      // existente en vez de crear uno nuevo. Se reinicia el contador de intentos.
      await prisma.electronicInvoice.update({ where: { id }, data: { attempts: 0, nextRetryAt: null } });
      const result = invoice.sale?.isReturn
        ? await emitCreditNoteForReturn(invoice.saleId, companyId, session.user.id)
        : await emitInvoiceForSale(invoice.saleId, companyId, session.user.id);

      return NextResponse.json({
        success: result.status === 'VALIDATED' || result.status === 'ACCEPTED',
        ...result,
      });
    }

    if (action === 'delete-pending') {
      if (invoice.status !== 'PENDING') {
        return NextResponse.json({ error: 'Solo se pueden limpiar documentos pendientes' }, { status: 400 });
      }
      if (!invoice.referenceCode) {
        return NextResponse.json(
          { error: 'El documento no tiene referenceCode; no se puede limpiar en Factus' },
          { status: 400 }
        );
      }

      // Si la DIAN ya lo validó, Factus rechaza el borrado y el error llega al usuario.
      await getProvider({ id: companyId }).discardRejected(
        companyId,
        invoice.referenceCode,
        invoice.sale?.isReturn ? 'credit_note' : 'invoice'
      );

      await prisma.electronicInvoice.update({
        where: { id },
        data: { status: 'CANCELLED', errorMessage: 'Limpiado de la cola pendiente de Factus', nextRetryAt: null },
      });
      await logAudit({
        userId: session.user.id,
        companyId,
        action: AUDIT_ACTION.FACTUS_INVOICE_CLEANED,
        entity: 'ElectronicInvoice',
        entityId: id,
        metadata: { cleanedPending: true, referenceCode: invoice.referenceCode },
      });

      return NextResponse.json({ success: true });
    }

    if (!invoice.consecutive && !invoice.factusBillId) {
      return NextResponse.json({ error: 'Factura no tiene ID en Factus' }, { status: 400 });
    }

    const factusIdentifier = (invoice.consecutive || invoice.factusBillId)!;
    const isCreditNote = invoice.sale?.isReturn === true;

    if (action === 'send-email') {
      const customerEmail = invoice.sale?.customer?.email || invoice.sale?.customer?.email;
      if (!customerEmail) {
        return NextResponse.json({ error: 'El cliente no tiene email' }, { status: 400 });
      }
      await factusRequest(
        `${isCreditNote ? '/v2/credit-notes' : '/v2/bills'}/${factusIdentifier}/send-email`,
        { method: HTTP_METHOD.POST, body: JSON.stringify({ email: customerEmail }) },
        companyId
      );
      return NextResponse.json({ success: true, message: 'Email enviado' });
    }

    if (action === 'refresh-status') {
      const factusData = await getInvoice(factusIdentifier, companyId, isCreditNote) as { status?: string; data?: { status?: string; is_validated?: boolean }; errors?: Record<string, string> };

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