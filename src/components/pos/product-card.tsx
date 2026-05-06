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

  const variants = [...product.product_variants].sort((a, b) => a.size - b.size);

  const handleSizeTap = (variant: ProductVariant) => {
    if (variant.stock <= 0) return;
    addItem(product, variant);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      {/* Image + info */}
      <div className="flex gap-3 mb-3">
        <div className="shrink-0 size-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="size-full object-cover"
            />
          ) : (
            <Package className="size-8 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-tight truncate">{product.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">SKU: {product.sku}</p>
          {product.brand && (
            <p className="text-xs text-muted-foreground truncate">{product.brand}</p>
          )}
          <p className="text-base font-bold text-primary mt-1">
            {formatCOP(product.price_sale)}
          </p>
        </div>
      </div>

      {/* Size buttons */}
      <div className="flex flex-wrap gap-1.5">
        {variants.map((variant) => {
          const outOfStock = variant.stock <= 0;
          const lowStock = variant.stock > 0 && variant.stock <= 3;

          return (
            <button
              key={variant.id}
              type="button"
              disabled={outOfStock}
              onClick={() => handleSizeTap(variant)}
              className={[
                'relative min-w-[44px] h-11 px-2 rounded-lg text-sm font-medium transition-colors active:scale-95',
                outOfStock
                  ? 'bg-muted text-muted-foreground/40 cursor-not-allowed line-through'
                  : lowStock
                    ? 'bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950 dark:text-orange-300'
                    : 'bg-secondary text-secondary-foreground border border-border hover:bg-primary hover:text-primary-foreground',
              ].join(' ')}
            >
              <span className="block text-sm font-semibold">{variant.size}</span>
              <span
                className={[
                  'block text-[10px] leading-none',
                  lowStock ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-muted-foreground',
                ].join(' ')}
              >
                ({variant.stock})
              </span>
            </button>
          );
        })}
        {variants.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Sin tallas disponibles</p>
        )}
      </div>
    </div>
  );
}
