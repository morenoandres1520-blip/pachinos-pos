'use client';

import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCOP } from '@/lib/format';
import { useCartStore } from '@/store/cart-store';

interface CartPanelProps {
  onCheckout: () => void;
}

export function CartPanel({ onCheckout }: CartPanelProps) {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const total = useCartStore((s) => s.total);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const totalAmount = total(false, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="size-20 rounded-full bg-amber-50 flex items-center justify-center">
          <ShoppingCart className="size-9 text-amber-300" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Carrito vacío</p>
          <p className="text-sm text-muted-foreground mt-1">
            Selecciona una talla para agregar productos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Items — scrollable */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-1">
          {items.map((item) => (
            <div
              key={item.variant.id}
              className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">
                  {item.product.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    T.{item.variant.size}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCOP(item.unitPrice)}
                  </span>
                </div>
              </div>

              {/* Qty controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                  className="size-8 rounded-lg bg-muted flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-bold tabular-nums">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                  disabled={item.quantity >= item.variant.stock}
                  className="size-8 rounded-lg bg-muted flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              {/* Subtotal + remove */}
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums">
                  {formatCOP(item.subtotal)}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(item.variant.id)}
                  className="mt-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Eliminar"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Totals + CTA */}
      <div className="shrink-0 border-t border-border bg-background px-4 pt-3 pb-4 space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatCOP(subtotal())}</span>
          </div>
          {discountAmount() > 0 && (
            <div className="flex justify-between text-sm font-medium text-green-600">
              <span>Descuento</span>
              <span className="tabular-nums">−{formatCOP(discountAmount())}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1.5 border-t border-border">
            <span className="font-bold text-base">Total</span>
            <span className="font-bold text-xl tabular-nums text-amber-900">
              {formatCOP(totalAmount)}
            </span>
          </div>
        </div>

        <Button
          onClick={onCheckout}
          className="w-full h-14 text-base font-bold rounded-2xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-lg shadow-green-600/20 transition-all"
        >
          Cobrar {formatCOP(totalAmount)}
        </Button>
      </div>
    </div>
  );
}
