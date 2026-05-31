import { sileo } from "sileo"

export function useToast() {
  return {
    success: (message: string) => sileo.success({ title: message }),
    error: (message: string) => sileo.error({ title: message }),
    info: (message: string) => sileo.info({ title: message }),
  }
}
