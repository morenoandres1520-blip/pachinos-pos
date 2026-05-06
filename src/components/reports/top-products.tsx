'use client';

import { TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCOP } from '@/lib/format';

interface TopProduct {
  productName: string;
  quantity: number;
  revenue: number;
}

interface TopProductsProps {
  data: TopProduct[];
  loading: boolean;
}

export function TopProducts({ data, loading }: TopProductsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-amber-700" />
          Top 5 productos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">Sin datos para este periodo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((product, index) => (
              <div
                key={product.productName}
                className="flex items-center justify-between rounded-lg bg-amber-50/50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                      {index + 1}
                    </span>
                    <p className="truncate text-sm font-medium text-foreground">
                      {product.productName}
                    </p>
                  </div>
                  <p className="ml-7 text-xs text-muted-foreground">
                    {product.quantity} {product.quantity === 1 ? 'unidad' : 'unidades'}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-amber-800">
                  {formatCOP(product.revenue)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
