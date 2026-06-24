export const FACTUS_TRANSACTION_TYPE = {
  PURCHASE: "PURCHASE",
  CONSUMPTION: "CONSUMPTION",
} as const

export const FE_STATUS = {
  PENDING: "PENDING",
  VALIDATED: "VALIDATED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const

export const FACTUS_INVOICE_TYPE = {
  INVOICE: "invoice",
  CREDIT_NOTE: "credit-note",
} as const

export const FACTUS_DOCUMENT_TYPE = {
  SALES_INVOICE: "21",
  CREDIT_NOTE: "22",
} as const
