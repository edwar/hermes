export const HTTP_METHOD = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
} as const

export const CONTENT_TYPE = {
  JSON: "application/json",
  FORM_URLENCODED: "application/x-www-form-urlencoded",
  CSV: "text/csv; charset=utf-8",
} as const

export const HEADER_NAME = {
  AUTHORIZATION: "Authorization",
  CONTENT_TYPE: "Content-Type",
  ACCEPT: "Accept",
  CONTENT_DISPOSITION: "Content-Disposition",
} as const
