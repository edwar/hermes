import {
  DocumentTypeCodes,
  OrganizationTypes,
} from './reference-tables';
import { getPaymentMethodConfig, getSystemConfig } from '@/lib/config/service';
import type { Sale, SaleItem, Customer, Company, Product } from '@prisma/client';

export interface FactusInvoicePayload {
  reference_code: string;
  document: string;
  numbering_range_id?: number;
  operation_type: string;
  observation?: string;
  payment_details: {
    payment_form: string;
    payment_method_code: string;
    reference_code?: string;
    amount: string;
    due_date?: string;
  }[];
  cash_rounding_amount?: string;
  customer: {
    identification_document_code: string;
    identification: string;
    dv?: string;
    company?: string;
    trade_name?: string;
    names?: string;
    address: string;
    email?: string;
    phone?: string;
    legal_organization_code: string;
    tribute_code: string;
    municipality_code?: string;
  };
  items: {
    code_reference: string;
    name: string;
    quantity: string;
    discount_rate: string;
    price: string;
    unit_measure_code: string;
    standard_code: string;
    taxes: {
      code: string;
      rate: string;
    }[];
  }[];
}

export interface FactusCreditNotePayload {
  numbering_range_id?: number;
  correction_concept_code: number;
  customization_id: number;
  reference_code: string;
  observation?: string;
  payment_details: {
    payment_form: string;
    payment_method_code: string;
    reference_code: string;
    amount: string;
  }[];
  bill_number: string;
  customer: {
    identification: string;
    identification_document_code: string;
    names: string;
    address: string;
    email: string;
    phone: string;
    legal_organization_id: string;
    tribute_id: string;
    municipality_id?: string;
  };
  items: {
    note: string;
    code_reference: string;
    name: string;
    quantity: number;
    discount_rate: number;
    price: number;
    unit_measure_code: string;
    standard_code: string;
    taxes: {
      code: string;
      rate: string;
    }[];
  }[];
}

async function mapPaymentMethod(method: string, companyId: string): Promise<{ payment_form: number; payment_method_code: string }> {
  const config = await getPaymentMethodConfig(companyId, method)
  return { payment_form: config.factusPaymentForm, payment_method_code: config.factusPaymentMethodCode }
}

function mapCustomerToFactus(
  customer: Customer | null,
  company: Company
) {
  if (customer?.cedula && customer.cedula.trim()) {
    const docType = customer.documentType || '13';
    const isNit = docType === '31';
    return {
      identification_document_code: docType,
      identification: customer.cedula.trim(),
      dv: customer.dv || undefined,
      company: isNit ? customer.name : undefined,
      names: isNit ? undefined : customer.name,
      trade_name: undefined,
      address: customer.address || company.address || 'Sin dirección',
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      legal_organization_code: isNit ? '1' : '2',
      tribute_code: '01',
      municipality_code: '68679',
    };
  }

  return {
    identification_document_code: '13',
    identification: '222222222222',
    dv: '2',
    company: 'Consumidor Final',
    names: 'Consumidor Final',
    address: 'N/A',
    legal_organization_code: '2',
    tribute_code: 'ZZ',
  };
}

async function mapSaleItemToFactus(item: SaleItem & { product: Product }, companyId: string) {
  const unitPrice = Number(item.unitPrice);

  const [unitMeasureCode, identificationStandard] = await Promise.all([
    getSystemConfig(companyId, 'unitMeasureCode'),
    getSystemConfig(companyId, 'identificationStandard'),
  ]);

  return {
    code_reference: item.product.barcode || item.productId,
    name: item.product.name,
    quantity: Number(item.quantity).toFixed(2),
    discount_rate: '0.00',
    price: unitPrice.toFixed(2),
    unit_measure_code: unitMeasureCode || '94',
    standard_code: identificationStandard || '999',
    taxes: [
      {
        code: '01',
        rate: '19.00',
      },
    ],
  };
}

export async function mapSaleToFactusInvoice(
  sale: Sale & {
    items: (SaleItem & { product: Product })[];
    customer: Customer | null;
    company: Company;
  },
  numberingRangeId: number | undefined,
  referenceCode: string
): Promise<FactusInvoicePayload> {
  const payment = await mapPaymentMethod(sale.paymentMethod, sale.companyId);
  const items = await Promise.all(sale.items.map((item) => mapSaleItemToFactus(item, sale.companyId)));

  const customer = mapCustomerToFactus(sale.customer, sale.company);
  const saleTotal = Number(sale.total);
  const subtotalFromItems = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const taxFromItems = items.reduce((sum, item) => {
    const itemTax = item.taxes[0];
    return sum + (Number(item.price) * Number(item.quantity) * Number(itemTax.rate)) / 100;
  }, 0);
  const calculatedTotal = subtotalFromItems + taxFromItems;

  return {
    reference_code: referenceCode,
    document: '01',
    numbering_range_id: numberingRangeId,
    operation_type: '10',
    observation: sale.notes || undefined,
    payment_details: [
      {
        payment_form: String(payment.payment_form),
        payment_method_code: payment.payment_method_code,
        reference_code: `sale-${sale.id.slice(0, 8)}`,
        amount: String(Math.round(calculatedTotal * 100) / 100),
        due_date: sale.paymentMethod === 'CREDIT' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
      },
    ],
    cash_rounding_amount: '0.00',
    customer,
    items,
  };
}

export async function mapSaleToFactusCreditNote(
  sale: Sale & {
    items: (SaleItem & { product: Product })[];
    customer: Customer | null;
    company: Company;
  },
  originalBillConsecutive: string,
  numberingRangeId: number | undefined,
  referenceCode: string,
  correctionConceptCode: number = 1
): Promise<FactusCreditNotePayload> {
  const payment = await mapPaymentMethod(sale.paymentMethod, sale.companyId);

  const [unitMeasureCode, identificationStandard] = await Promise.all([
    getSystemConfig(sale.companyId, 'unitMeasureCode'),
    getSystemConfig(sale.companyId, 'identificationStandard'),
  ]);

  const customer = sale.customer;
  const company = sale.company;

  const saleTotal = Math.abs(Number(sale.total));

  return {
    ...(numberingRangeId ? { numbering_range_id: numberingRangeId } : {}),
    correction_concept_code: correctionConceptCode,
    customization_id: 20,
    reference_code: referenceCode,
    observation: sale.returnReason || 'Devolución',
    payment_details: [
      {
        payment_form: String(payment.payment_form),
        payment_method_code: payment.payment_method_code,
        reference_code: `return-${sale.id.slice(0, 8)}`,
        amount: saleTotal.toFixed(2),
      },
    ],
    bill_number: originalBillConsecutive,
    customer: {
      identification: customer?.cedula?.trim() || '222222222222',
      identification_document_code: customer?.documentType || '13',
      names: customer?.name || 'Consumidor Final',
      address: customer?.address || company.address || 'Sin dirección',
      email: customer?.email || 'Sin email',
      phone: customer?.phone || '0000000000',
      legal_organization_id: customer?.documentType === '31' ? '1' : '2',
      tribute_id: '21',
      municipality_id: '68679',
    },
    items: sale.items.map((item) => ({
      note: 'Devolución de venta',
      code_reference: item.product.barcode || item.productId,
      name: item.product.name,
      quantity: Number(item.quantity),
      discount_rate: 0,
      price: Number(item.unitPrice),
      unit_measure_code: unitMeasureCode || '94',
      standard_code: identificationStandard || '999',
      taxes: [
        {
          code: '01',
          rate: '19.00',
        },
      ],
    })),
  };
}
