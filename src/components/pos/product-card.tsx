'use client';

import { Package } from 'lucide-react';
import { formatCOP } from '@/lib/format';
import { useCartStore } from '@/store/cart-store';
import type { Product, ProductVariant } from '@/types/database';

interface ProductWithVariants extends Product {
  product_variants: ProductVariant[];
}

interface ProductCardProps {
  product: ProductWithVariants;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  const variants = [...product.product_variants]
    .filter((v) => v.stock > 0)
    .sort((a, b) => Number(a.size) - Number(b.size));

  const getCartQty = (variantId: string) =>
    cartItems.find((i) => i.variant.id === variantId)?.quantity ?? 0;

  const handleSizeTap = (variant: ProductVariant) => {
    if (variant.stock <= 0) return;
    addItem(product, variant);
  };

  return (
    <div className="group rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
      {/* Image */}
      <div className="relative aspect-square w-full bg-muted overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="size-full object-cover group-active:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="size-10 text-muted-foreground/40" />
          </div>
        )}

        {/* Price badge */}
        <div className="absolute bottom-2 right-2">
          <span className="inline-flex items-center rounded-xl bg-amber-900/90 px-2.5 py-1 text-sm font-bold text-white backdrop-blur-sm shadow-lg">
            {formatCOP(product.sale_price)}
          </span>
        </div>

        {/* Category badge */}
        {product.category && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center rounded-lg bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              {product.category}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-2">
        <div>
          <h3 className="font-bold text-sm leading-tight line-clamp-1 text-foreground">
            {product.name}
          </h3>
          {product.brand && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {product.brand}
            </p>
          )}
        </div>

        {/* Size chips */}
        {variants.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-0.5 px-0.5">
            {variants.map((variant) => {
              const cartQty = getCartQty(variant.id);
              const remaining = variant.stock - cartQty;
              const low = remaining <= 3;
              const maxed = remaining <= 0;

              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={maxed}
                  onClick={() => handleSizeTap(variant)}
                  className={[
                    'relative shrink-0 flex flex-col items-center justify-center min-w-[42px] h-12 rounded-xl text-xs font-bold transition-all active:scale-90 select-none',
                    maxed
                      ? 'bg-muted/60 text-muted-foreground/40 cursor-not-allowed'
                      : cartQty > 0
                        ? 'bg-amber-700 text-white shadow-md shadow-amber-700/30'
                        : low
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-secondary text-secondary-foreground border border-border hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800',
                  ].join(' ')}
                >
                  <span className="leading-none">{variant.size}</span>
                  {cartQty > 0 ? (
                    <span className="text-[9px] leading-none mt-0.5 opacity-80">
                      +{cartQty} ✓
                    </span>
                  ) : (
                    <span className={[
                      'text-[9px] leading-none mt-0.5',
                      low ? 'text-orange-500 font-bold' : 'text-muted-foreground',
                    ].join(' ')}>
                      {remaining}u
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sin stock</p>
        )}
      </div>
    </div>
  );
}
