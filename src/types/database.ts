export type UserRole = 'admin' | 'cajera';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface BusinessConfig {
  id: string;
  name: string;
  nit: string;
  address: string;
  phone: string;
  city: string;
  logo_url: string | null;
  footer_message: string;
  iva_enabled: boolean;
  iva_rate: number;
  created_at: string;
}

export type ProductCategory = 'Dama' | 'Caballero' | 'Niño' | 'Niña' | 'Unisex';

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory | string;
  brand: string | null;
  color: string | null;
  material: string | null;
  price_cost: number;
  price_sale: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: number;
  stock: number;
  created_at: string;
}

export type InventoryMovementType = 'entrada' | 'salida' | 'correccion' | 'venta' | 'anulacion';

export interface InventoryMovement {
  id: string;
  product_variant_id: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  user_id: string;
  created_at: string;
  product_variant?: ProductVariant;
  user?: Profile;
}

export type SaleStatus = 'completada' | 'anulada';

export interface Sale {
  id: string;
  invoice_number: string;
  user_id: string;
  customer_name: string | null;
  customer_id_number: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  subtotal: number;
  discount: number;
  iva: number;
  total: number;
  status: SaleStatus;
  notes: string | null;
  void_reason: string | null;
  created_at: string;
  user?: Profile;
  items?: SaleItem[];
  payments?: SalePayment[];
}

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'nequi' | 'daviplata';

export interface SalePayment {
  id: string;
  sale_id: string;
  method: PaymentMethod;
  amount: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_variant_id: string;
  product_name: string;
  product_sku: string;
  size: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// Cart types for POS
export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CartPayment {
  method: PaymentMethod;
  amount: number;
}
