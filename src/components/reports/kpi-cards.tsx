'use client';

import { DollarSign, ShoppingCart, Receipt, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCOP } from '@/lib/format';

interface KpiCardsProps {
  totalVentas: number;
  numTransacciones: number;
  ticketPromedio: number;
  productosVendidos: number;
  loading: boolean;
}

const kpis = [
  {
    key: 'totalVentas' as const,
    label: 'Total ventas',
    icon: DollarSign,
    isMoney: true,
    color: 'text-green-700 bg-green-100',
  },
  {
    key: 'numTransacciones' as const,
    label: 'Transacciones',
    icon: Receipt,
    isMoney: false,
    color: 'text-amber-700 bg-amber-100',
  },
  {
    key: 'ticketPromedio' as const,
    label: 'Ticket promedio',
    icon: ShoppingCart,
    isMoney: true,
    color: 'text-blue-700 bg-blue-100',
  },
  {
    key: 'productosVendidos' as const,
    label: 'Productos vendidos',
    icon: Package,
    isMoney: false,
    color: 'text-purple-700 bg-purple-100',
  },
];

export function KpiCards({
  totalVentas,
  numTransacciones,
  ticketPromedio,
  productosVendidos,
  loading,
}: KpiCardsProps) {
  const values = { totalVentas, numTransacciones, ticketPromedio, productosVendidos };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.key}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-8 w-8 rounded-lg" />
              <Skeleton className="mb-1 h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const value = values[kpi.key];

        return (
          <Card key={kpi.key}>
            <CardContent className="p-4">
              <div className={`mb-2 inline-flex rounded-lg p-2 ${kpi.color}`}>
                <Icon className="size-4" />
              </div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-lg font-bold text-foreground">
                {kpi.isMoney ? formatCOP(value) : value.toLocaleString('es-CO')}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
