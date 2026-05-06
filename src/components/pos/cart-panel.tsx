'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCOP } from '@/lib/format';
import { useCartStore } from '@/store/cart-store';

interface CartPanelProps {
  ivaEnabled: boolean;
  ivaRate: number;
  onCheckout: () => void;
}

export function CartPanel({ ivaEnabled, ivaRate, onCheckout }: CartPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const ivaAmount = useCartStore((s) => s.ivaAmount);
  const total = useCartStore((s) => s.total);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border shadow-2xl rounded-t-2xl safe-bottom">
      {/* Collapsed header - always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <ShoppingCart className="size-5" />
            <span className="absolute -top-2 -right-2 size-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          </div>
          <span className="font-semibold text-sm">
            {items.length} producto{items.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">
            {formatCOP(total(ivaEnabled, ivaRate))}
          </span>
          {expanded ? (
            <ChevronDown className="size-5 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded cart items */}
      {expanded && (
        <div className="max-h-[50vh] overflow-y-auto border-t border-border">
          <div className="px-4 py-2 space-y-2">
            {items.map((item) => (
              <div
                key={item.variant.id}
                className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
              >
                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Talla {item.variant.size} &middot; {formatCOP(item.unitPrice)}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.variant.id, item.quantity - 1)
                    }
                    className="size-9 rounded-lg bg-muted flex items-center justify-center active:bg-muted/70"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.variant.id, item.quantity + 1)
                    }
                    className="size-9 rounded-lg bg-muted flex items-center justify-center active:bg-muted/70"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                {/* Subtotal + remove */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    {formatCOP(item.subtotal)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variant.id)}
                    className="text-destructive hover:text-destructive/80 mt-0.5"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-4 py-3 border-t border-border space-y-1 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCOP(subtotal())}</span>
            </div>
            {discountAmount() > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento</span>
                <span>-{formatCOP(discountAmount())}</span>
              </div>
            )}
            {ivaEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  IVA ({ivaRate}%)
                </span>
                <span>{formatCOP(ivaAmount(ivaEnabled, ivaRate))}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-1 border-t border-border">
              <span>Total</span>
              <span>{formatCOP(total(ivaEnabled, ivaRate))}</span>
            </div>
          </div>
        </div>
      )}

      {/* COBRAR button */}
      <div className="px-4 py-3 border-t border-border">
        <Button
          onClick={onCheckout}
          className="w-full h-14 text-lg font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white"
        >
          COBRAR {formatCOP(total(ivaEnabled, ivaRate))}
        </Button>
      </div>
    </div>
  );
}
