export const DocumentTypeCodes = {
  CC: '13',
  CE: '21',
  NIT: '31',
  PASSPORT: '41',
  FOREIGN: '42',
  PEP: '47',
  PPT: '48',
  NIT_FOREIGN: '50',
  RC: '11',
  TI: '12',
  NUIP: '91',
} as const;

export type DocumentTypeCode = (typeof DocumentTypeCodes)[keyof typeof DocumentTypeCodes];

export const InvoiceTypes = {
  ELECTRONIC_INVOICE: '01',
  TRANSMISSION_INSTRUMENT: '03',
} as const;

export const OperationTypes = {
  STANDARD: '10',
  MANDATES: '11',
  TRANSPORT: '12',
} as const;

export const CorrectionCodes = {
  PARTIAL_RETURN: '1',
  ANNULLING: '2',
  DISCOUNT: '3',
  PRICE_ADJUSTMENT: '4',
  COMMERCIAL_DISCOUNT_CASH: '5',
  COMMERCIAL_DISCOUNT_VOLUME: '6',
} as const;

export const CreditNoteOperationTypes = {
  WITH_REFERENCE: '20',
  WITHOUT_REFERENCE: '22',
} as const;

export const ProductIdentificationStandards = {
  UNSPSC: '001',
  TARIFF: '020',
  GTIN: '010',
  ADOPTANT: '999',
} as const;

export const ClaimConcepts = {
  INCONSISTENCIES: '01',
  NOT_DELIVERED_FULL: '02',
  PARTIALLY_DELIVERED: '03',
  SERVICE_NOT_PROVIDED: '04',
} as const;

export const EventCodes = {
  ACKNOWLEDGMENT: '030',
  CLAIM: '031',
  RECEIPT_GOODS: '032',
  EXPRESS_ACCEPTANCE: '033',
  TACIT_ACCEPTANCE: '034',
} as const;

export const CustomerTaxTypes = {
  IVA: '01',
  NO_APPLIES: 'ZZ',
} as const;

export const TaxCodes = {
  IVA: '01',
  NATIONAL_CONSUMPTION: '04',
  UNHEALTHY_FOODS: '35',
} as const;

export const RetentionCodes = {
  IVA_RETENTION: '05',
  INCOME_RETENTION: '06',
} as const;

export const OrganizationTypes = {
  LEGAL_ENTITY: '1',
  NATURAL_PERSON: '2',
} as const;

export const PaymentMethods = {
  CASH: '10',
  CONSIGNMENT: '42',
  CHECK: '20',
  TRANSFER: '47',
  BONDS: '71',
  VOUCHERS: '72',
  UNDEFINED: '1',
  DEBIT_CARD: '49',
  CREDIT_CARD: '48',
  OTHER: 'ZZZ',
} as const;

export const PaymentForms = {
  CASH: '1',
  CREDIT: '2',
} as const;

export const NumberingRangeDocumentTypes = {
  SALES_INVOICE: '21',
  CREDIT_NOTE: '22',
  DEBIT_NOTE: '23',
  SUPPORT_DOCUMENT: '24',
  SUPPORT_ADJUSTMENT_NOTE: '25',
  PAYROLL: '26',
  PAYROLL_ADJUSTMENT_NOTE: '27',
  ELIMINATION_PAYROLL_NOTE: '28',
  INVOICE_TALONARIO_PAPER: '30',
} as const;

export const SupportDocumentIdentityTypes = {
  CE_ALIEN_CARD: '21',
  CE_ALIEN_REGISTRATION: '22',
  NIT: '31',
  PASSPORT: '41',
  FOREIGN_ID: '42',
  PEP: '47',
  NIT_FOREIGN: '50',
} as const;

export const AdjustmentMotives = {
  PARTIAL_RETURN: '1',
  ANNULLING: '2',
  DISCOUNT: '3',
  PRICE_ADJUSTMENT: '4',
  OTHERS: '5',
} as const;

export const DiscountCodes = {
  UNCONDITIONED: '00',
  CONDITIONED: '01',
  UNCONDITIONED_SURCHARGE: '02',
  CONDITIONED_SURCHARGE: '03',
} as const;

export const FiscalResponsibilities = {
  GRAN_CONTRIBUTOR: 'O-13',
  SELF_RETAINER: 'O-15',
  VAT_RETENTION_AGENT: 'O-23',
  SIMPLE_TAX: 'O-47',
  NON_RESPONSIBLE: 'R-99-PN',
} as const;

export const municipalitiesCache = new Map<string, { code: string; name: string }[]>();

export async function getMunicipalityCode(
  departmentName: string,
  cityName: string
): Promise<string> {
  const cacheKey = `${departmentName}-${cityName}`.toLowerCase();

  if (municipalitiesCache.has(cacheKey)) {
    return municipalitiesCache.get(cacheKey)![0]?.code || '17001';
  }

  return '17001';
}

export function formatCurrencyCOP(amount: number | string): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.round(num);
}

export function calculateTaxableAmount(
  unitPrice: number,
  quantity: number,
  taxRate: number = 0.19
): { taxable: number; tax: number; total: number } {
  const subtotal = unitPrice * quantity;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;
  return { taxable: subtotal, tax, total };
}
