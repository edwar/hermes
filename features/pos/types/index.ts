export interface CartItem {
  productId: string
  name: string
  barcode?: string | null
  price: number
  quantity: number
  subtotal: number
  stock: number
}

export interface CartState {
  items: CartItem[]
  customerId?: string
  customerName?: string
  notes?: string
}
