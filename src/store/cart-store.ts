'use client';

import { create } from 'zustand';
import type { CartItem, CartPayment, Product, ProductVariant } from '@/types/database';

interface CartStore {
  items: CartItem[];
  payments: CartPayment[];
  customerName: string;
  customerIdNumber: string;
  customerPhone: string;
  customerEmail: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  notes: string;

  // Computed
  subtotal: () => number;
  discountAmount: () => number;
  total: (ivaEnabled: boolean, ivaRate: number) => number;
  ivaAmount: (ivaEnabled: boolean, ivaRate: number) => number;
  totalPayments: () => number;

  // Actions
  addItem: (product: Product, variant: ProductVariant) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  setCustomer: (field: 'customerName' | 'customerIdNumber' | 'customerPhone' | 'customerEmail', value: string) => void;
  setDiscount: (type: 'percentage' | 'fixed', value: number) => void;
  setNotes: (notes: string) => void;
  addPayment: (payment: CartPayment) => void;
  removePayment: (index: number) => void;
  clearPayments: () => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  payments: [],
  customerName: '',
  customerIdNumber: '',
  customerPhone: '',
  customerEmail: '',
  discountType: 'fixed',
  discountValue: 0,
  notes: '',

  subtotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  discountAmount: () => {
    const { discountType, discountValue } = get();
    const subtotal = get().subtotal();
    if (discountType === 'percentage') {
      return Math.round((subtotal * discountValue) / 100);
    }
    return discountValue;
  },

  ivaAmount: (ivaEnabled: boolean, ivaRate: number) => {
    if (!ivaEnabled) return 0;
    const subtotal = get().subtotal();
    const discount = get().discountAmount();
    return Math.round((subtotal - discount) * (ivaRate / 100));
  },

  total: (ivaEnabled: boolean, ivaRate: number) => {
    const subtotal = get().subtotal();
    const discount = get().discountAmount();
    const iva = get().ivaAmount(ivaEnabled, ivaRate);
    return subtotal - discount + iva;
  },

  totalPayments: () => {
    return get().payments.reduce((sum, p) => sum + p.amount, 0);
  },

  addItem: (product, variant) => {
    set((state) => {
      const existing = state.items.find((item) => item.variant.id === variant.id);
      if (existing) {
        if (existing.quantity >= variant.stock) return state;
        return {
          items: state.items.map((item) =>
            item.variant.id === variant.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  subtotal: (item.quantity + 1) * item.unitPrice,
                }
              : item
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            product,
            variant,
            quantity: 1,
            unitPrice: product.sale_price,
            subtotal: product.sale_price,
          },
        ],
      };
    });
  },

  removeItem: (variantId) => {
    set((state) => ({
      items: state.items.filter((item) => item.variant.id !== variantId),
    }));
  },

  updateQuantity: (variantId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(variantId);
      return;
    }
    set((state) => ({
      items: state.items.map((item) => {
        if (item.variant.id !== variantId) return item;
        const capped = Math.min(quantity, item.variant.stock);
        return { ...item, quantity: capped, subtotal: capped * item.unitPrice };
      }),
    }));
  },

  setCustomer: (field, value) => {
    set({ [field]: value });
  },

  setDiscount: (type, value) => {
    set({ discountType: type, discountValue: value });
  },

  setNotes: (notes) => {
    set({ notes });
  },

  addPayment: (payment) => {
    set((state) => ({ payments: [...state.payments, payment] }));
  },

  removePayment: (index) => {
    set((state) => ({
      payments: state.payments.filter((_, i) => i !== index),
    }));
  },

  clearPayments: () => {
    set({ payments: [] });
  },

  clearCart: () => {
    set({
      items: [],
      payments: [],
      customerName: '',
      customerIdNumber: '',
      customerPhone: '',
      customerEmail: '',
      discountType: 'fixed',
      discountValue: 0,
      notes: '',
    });
  },
}));
