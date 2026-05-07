'use client';

import { Package, Pencil, ToggleLeft, ToggleRight, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCOP } from '@/lib/format';
import type { Product, ProductVariant } from '@/types/database';

interface InventoryCardProps {
  product: Product;
  variants: ProductVariant[];
  lowStockThreshold?: number;
  canManage?: boolean;
  onEdit?: () => void;
  onToggleActive?: () => void;
  onAdjustStock?: () => void;
}

export function InventoryCard({
  product,
  variants,
  lowStockThreshold = 3,
  canManage = false,
  onEdit,
  onToggleActive,
  onAdjustStock,
}: InventoryCardProps) {
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const hasLowStock = variants.some((v) => v.stock > 0 && v.stock <= lowStockThreshold);
  const isOutOfStock = totalStock === 0;
  const isInactive = !product.is_active;

  return (
    <div
      className={[
        'group flex rounded-2xl border border-border bg-card overflow-hidden',
        'transition-all hover:shadow-md hover:border-amber-200',
        'sm:flex-col',                   // vertical on sm+
        isInactive ? 'opacity-55' : '',
      ].join(' ')}
    >
      {/* ── Image ─────────────────────────────────── */}
      <div className="
        relative shrink-0
        w-24 h-24                        /* mobile: small square */
        sm:w-full sm:h-auto sm:aspect-[4/3]  /* desktop: wide banner */
        bg-muted overflow-hidden
        rounded-l-2xl sm:rounded-t-2xl sm:rounded-bl-none
      ">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="size-8 text-muted-foreground/40" />
          </div>
        )}

        {/* Status overlays */}
        {isInactive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
              INACTIVO
            </span>
          </div>
        )}
        {!isInactive && isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-[10px] font-bold text-white bg-red-600/80 px-1.5 py-0.5 rounded">
              SIN STOCK
            </span>
          </div>
        )}
        {!isInactive && !isOutOfStock && hasLowStock && (
          <div className="absolute top-1.5 right-1.5">
            <AlertTriangle className="size-4 text-amber-500 drop-shadow" />
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-between p-3 min-w-0 gap-2">
        {/* Top: name + info */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold leading-tight text-foreground">
                {product.name}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {product.sku}
                {product.brand && ` · ${product.brand}`}
              </p>
            </div>
            {/* Stock badge — top right on mobile */}
            <Badge
              variant={isOutOfStock ? 'destructive' : hasLowStock ? 'warning' : 'secondary'}
              className="shrink-0 text-[10px] tabular-nums"
            >
              {totalStock} uds
            </Badge>
          </div>
        </div>

        {/* Middle: price + category */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-amber-900 tabular-nums">
            {formatCOP(product.sale_price)}
          </span>
          {product.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {product.category}
            </Badge>
          )}
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex gap-1.5 pt-0.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1 rounded-xl"
              onClick={onEdit}
            >
              <Pencil className="size-3" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="h-8 w-8 rounded-xl"
              onClick={onToggleActive}
              title={product.is_active ? 'Desactivar' : 'Activar'}
            >
              {product.is_active
                ? <ToggleRight className="size-4 text-green-600" />
                : <ToggleLeft className="size-4 text-muted-foreground" />}
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="h-8 w-8 rounded-xl"
              onClick={onAdjustStock}
              title="Ajustar stock"
            >
              <SlidersHorizontal className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
