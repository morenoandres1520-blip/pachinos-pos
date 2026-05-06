'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCOP } from '@/lib/format';

interface SellerData {
  sellerName: string;
  numSales: number;
  totalAmount: number;
}

interface SellerReportProps {
  data: SellerData[];
  loading: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-foreground">{label}</p>
      <p className="text-sm font-bold text-amber-900">{formatCOP(payload[0].value)}</p>
    </div>
  );
}

export function SellerReport({ data, loading }: SellerReportProps) {
  const chartData = data.map((s) => ({
    name: s.sellerName.split(' ')[0],
    total: s.totalAmount,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-amber-700" />
          Ventas por vendedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[180px] w-full rounded-lg" />
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">Sin datos para este periodo</p>
          </div>
        ) : (
          <>
            {/* Horizontal bar chart */}
            <ResponsiveContainer width="100%" height={Math.max(120, data.length * 50)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="total"
                  fill="#b45309"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Seller detail cards */}
            <div className="mt-4 space-y-2">
              {data.map((seller) => (
                <div
                  key={seller.sellerName}
                  className="flex items-center justify-between rounded-lg bg-amber-50/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {seller.sellerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {seller.numSales} {seller.numSales === 1 ? 'venta' : 'ventas'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-amber-800">
                    {formatCOP(seller.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
