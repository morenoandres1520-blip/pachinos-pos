'use client';

import { Package, Pencil, ToggleLeft, ToggleRight, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

  return (
    <Card className={`transition-shadow hover:shadow-md ${!product.is_active ? 'opacity-60' : ''}`}>
      {/* Product image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="size-12 text-muted-foreground" />
          </div>
        )}

        {/* Status overlay */}
        {!product.is_active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Badge variant="secondary" className="text-xs">Inactivo</Badge>
          </div>
        )}
        {product.is_active && isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Badge variant="destructive" className="text-xs">Sin stock</Badge>
          </div>
        )}
        {product.is_active && !isOutOfStock && hasLowStock && (
          <div className="absolute right-2 top-2">
            <Badge className="bg-amber-500 text-white text-xs">Stock bajo</Badge>
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        <div>
          <h3 className="truncate text-sm font-semibold leading-tight">{product.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{product.sku}</p>
          {product.brand && (
            <p className="text-xs text-muted-foreground truncate">{product.brand}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">{formatCOP(product.sale_price)}</span>
          <Badge
            variant={isOutOfStock ? 'destructive' : totalStock <= lowStockThreshold ? 'outline' : 'secondary'}
            className="text-xs"
          >
            {totalStock} uds
          </Badge>
        </div>

        {/* Category badge */}
        <Badge variant="outline" className="text-xs w-fit">
          {product.category}
        </Badge>

        {/* Admin actions */}
        {canManage && (
          <div className="flex gap-1 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs gap-1"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={onToggleActive}
              title={product.is_active ? 'Desactivar' : 'Activar'}
            >
              {product.is_active ? (
                <ToggleRight className="h-4 w-4 text-green-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={onAdjustStock}
              title="Ajustar stock"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
