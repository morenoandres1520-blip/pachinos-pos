'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCOP } from '@/lib/format';
import type { PaymentMethod } from '@/types/database';

interface PaymentMethodData {
  method: PaymentMethod;
  total: number;
}

interface PaymentMethodsChartProps {
  data: PaymentMethodData[];
  loading: boolean;
}

const METHOD_COLORS: Record<PaymentMethod, string> = {
  efectivo: '#16a34a',
  tarjeta: '#2563eb',
  transferencia: '#9333ea',
  nequi: '#ec4899',
  daviplata: '#ea580c',
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{entry.name}</p>
      <p className="text-sm font-bold">{formatCOP(entry.value)}</p>
    </div>
  );
}

function renderLabel({ name, percent }: any) {
  return `${name} ${(percent * 100).toFixed(0)}%`;
}

export function PaymentMethodsChart({ data, loading }: PaymentMethodsChartProps) {
  const chartData = data.map((d) => ({
    name: METHOD_LABELS[d.method],
    value: d.total,
    method: d.method,
  }));

  const grandTotal = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Metodos de pago</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="mx-auto h-[250px] w-full rounded-lg" />
        ) : chartData.length === 0 || grandTotal === 0 ? (
          <div className="flex h-[250px] items-center justify-center">
            <p className="text-sm text-muted-foreground">Sin datos para este periodo</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                outerRadius={80}
                innerRadius={40}
                dataKey="value"
                label={renderLabel}
                labelLine={false}
                fontSize={11}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.method}
                    fill={METHOD_COLORS[entry.method]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
