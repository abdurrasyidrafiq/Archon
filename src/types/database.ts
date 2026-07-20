export type UserRole = 'owner' | 'employee'

export interface AppUser {
  id: string
  role: UserRole
  username: string
  email: string
  created_at: string
  is_active: boolean
}

export interface Company {
  business_id: string
  owner_id: string
  name: string
  industry: string | null
  address: string | null
  phone: string | null
  created_at: string
}

export interface CompanyWorker {
  worker_id: string
  employee_id: string
  work_at: string
  created_at: string
}

export interface Product {
  product_id: string
  business_id: string
  name: string
  sell_price: number
  production_cost: number
}

export interface Expense {
  expense_id: string
  business_id: string
  user_id: string
  cost_price: number
  amount: number
  purchase_date: string
}

export interface InventoryItem {
  inventory_id: string
  expense_id: string
  name: string
  current_stock: number
  updated_at: string
}

export interface Ingredient {
  product_id: string
  inventory_id: string
  quantity: number
}

export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'qris'

export interface Transaction {
  sales_id: string
  sale_date: string
  payment_method: string
  payment_status: boolean
  subtotal: number
  tax: number
  total: number
  business_id: string
  cashier_id: string
}

export interface ReceiptDetail {
  id: string
  sales_id: string
  product_id: string
  name: string
  quantity: number
  price: number
  subtotal: number
}

export interface CheckoutItem {
  product_id: string
  quantity: number
}
