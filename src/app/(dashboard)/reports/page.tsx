'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ShieldAlert, Loader2, CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate } from '@/lib/format';
import { KpiCards } from '@/components/reports/kpi-cards';
import { SalesChart } from '@/components/reports/sales-chart';
import { PaymentMethodsChart } from '@/components/reports/payment-methods-chart';
import { TopProducts } from '@/components/reports/top-products';
import { SellerReport } from '@/components/reports/seller-report';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { PaymentMethod } from '@/types/database';

type RangePreset = 'today' | 'week' | 'month' | 'custom';

interface ReportData {
  totalVentas: number;
  numTransacciones: number;
  ticketPromedio: number;
  productosVendidos: number;
  dailySales: { date: string; total: number }[];
  paymentMethods: { method: PaymentMethod; total: number }[];
  topProducts: { productName: string; quantity: number; revenue: number }[];
  sellers: { sellerName: string; numSales: number; totalAmount: number }[];
}

const emptyData: ReportData = {
  totalVentas: 0,
  numTransacciones: 0,
  ticketPromedio: 0,
  productosVendidos: 0,
  dailySales: [],
  paymentMethods: [],
  topProducts: [],
  sellers: [],
};

function getDateRange(preset: RangePreset, customStart?: string, customEnd?: string) {
  const now = new Date();
  // Bogota is UTC-5
  const bogotaOffset = -5 * 60;
  const utcOffset = now.getTimezoneOffset();
  const diff = bogotaOffset - utcOffset;
  const bogotaNow = new Date(now.getTime() + diff * 60 * 1000);

  let start: Date;
  let end: Date;

  if (preset === 'custom' && customStart && customEnd) {
    // Custom dates are in local Bogota time
    start = new Date(customStart + 'T00:00:00');
    end = new Date(customEnd + 'T23:59:59.999');
    // Convert from Bogota to UTC
    const startUTC = new Date(start.getTime() - diff * 60 * 1000);
    const endUTC = new Date(end.getTime() - diff * 60 * 1000);
    return { start: startUTC.toISOString(), end: endUTC.toISOString() };
  }

  switch (preset) {
    case 'today':
      start = new Date(bogotaNow);
      start.setHours(0, 0, 0, 0);
      end = new Date(bogotaNow);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week': {
      start = new Date(bogotaNow);
      const day = start.getDay();
      const mondayDiff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + mondayDiff);
      start.setHours(0, 0, 0, 0);
      end = new Date(bogotaNow);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'month':
      start = new Date(bogotaNow.getFullYear(), bogotaNow.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(bogotaNow);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start = new Date(bogotaNow);
      start.setHours(0, 0, 0, 0);
      end = new Date(bogotaNow);
      end.setHours(23, 59, 59, 999);
  }

  const startUTC = new Date(start.getTime() - diff * 60 * 1000);
  const endUTC = new Date(end.getTime() - diff * 60 * 1000);
  return { start: startUTC.toISOString(), end: endUTC.toISOString() };
}

export default function ReportsPage() {
  const { canViewReports, loading: permLoading } = usePermissions();
  const [rangePreset, setRangePreset] = useState<RangePreset>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<ReportData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const { start, end } = getDateRange(rangePreset, customStart, customEnd);

      // Fetch completed sales within range
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          total,
          created_at,
          user_id,
          user:profiles!sales_user_id_fkey(full_name),
          items:sale_items(product_name, quantity, subtotal),
          payments:sale_payments(method, amount)
        `)
        .eq('status', 'completada')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true });

      if (salesError) {
        setFetchError(true);
        setData(emptyData);
        setLoading(false);
        return;
      }

      if (!sales || sales.length === 0) {
        setData(emptyData);
        setLoading(false);
        return;
      }

      // KPIs
      const totalVentas = sales.reduce((sum, s) => sum + (s.total ?? 0), 0);
      const numTransacciones = sales.length;
      const ticketPromedio = numTransacciones > 0 ? totalVentas / numTransacciones : 0;

      let productosVendidos = 0;
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      for (const sale of sales) {
        const items = (sale.items as any[]) ?? [];
        for (const item of items) {
          productosVendidos += item.quantity ?? 0;
          const existing = productMap.get(item.product_name) ?? { quantity: 0, revenue: 0 };
          existing.quantity += item.quantity ?? 0;
          existing.revenue += item.subtotal ?? 0;
          productMap.set(item.product_name, existing);
        }
      }

      // Daily sales aggregation
      const dailyMap = new Map<string, number>();
      for (const sale of sales) {
        const dateKey = formatDate(sale.created_at);
        dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + (sale.total ?? 0));
      }
      const dailySales = Array.from(dailyMap.entries()).map(([date, total]) => ({
        date,
        total,
      }));

      // Payment methods aggregation
      const paymentMap = new Map<PaymentMethod, number>();
      for (const sale of sales) {
        const payments = (sale.payments as any[]) ?? [];
        for (const payment of payments) {
          const method = payment.method as PaymentMethod;
          paymentMap.set(method, (paymentMap.get(method) ?? 0) + (payment.amount ?? 0));
        }
      }
      const paymentMethods = Array.from(paymentMap.entries()).map(([method, total]) => ({
        method,
        total,
      }));

      // Top 5 products
      const topProducts = Array.from(productMap.entries())
        .map(([productName, { quantity, revenue }]) => ({ productName, quantity, revenue }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Sellers aggregation
      const sellerMap = new Map<string, { numSales: number; totalAmount: number }>();
      for (const sale of sales) {
        const sellerName =
          (sale.user as any)?.full_name ?? 'Desconocido';
        const existing = sellerMap.get(sellerName) ?? { numSales: 0, totalAmount: 0 };
        existing.numSales += 1;
        existing.totalAmount += sale.total ?? 0;
        sellerMap.set(sellerName, existing);
      }
      const sellers = Array.from(sellerMap.entries())
        .map(([sellerName, { numSales, totalAmount }]) => ({
          sellerName,
          numSales,
          totalAmount,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      setData({
        totalVentas,
        numTransacciones,
        ticketPromedio,
        productosVendidos,
        dailySales,
        paymentMethods,
        topProducts,
        sellers,
      });
    } catch {
      setFetchError(true);
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  }, [supabase, rangePreset, customStart, customEnd]);

  useEffect(() => {
    if (!permLoading && canViewReports) {
      fetchReportData();
    }
  }, [permLoading, canViewReports, fetchReportData]);

  // Permission loading state
  if (permLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-amber-700" />
      </div>
    );
  }

  // Access denied
  if (!canViewReports) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
        <ShieldAlert className="size-12 text-amber-400" />
        <h2 className="text-lg font-semibold text-foreground">Sin acceso</h2>
        <p className="text-center text-sm text-muted-foreground">
          No tienes permisos para ver los reportes. Contacta al administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-amber-900">Reportes</h2>
        <p className="text-sm text-muted-foreground">
          Resumen de ventas y rendimiento
        </p>
      </div>

      <Separator className="bg-amber-200" />

      {/* Date range selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-amber-700" />
          <span className="text-sm font-medium text-foreground">Periodo</span>
        </div>
        <Select value={rangePreset} onValueChange={(v) => setRangePreset(v as RangePreset)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="custom">Rango personalizado</SelectItem>
          </SelectContent>
        </Select>

        {rangePreset === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {fetchError && !loading && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          No se pudieron cargar los reportes. Verifica tu conexión e intenta de nuevo.
        </div>
      )}

      {/* KPI Cards */}
      <KpiCards
        totalVentas={data.totalVentas}
        numTransacciones={data.numTransacciones}
        ticketPromedio={data.ticketPromedio}
        productosVendidos={data.productosVendidos}
        loading={loading}
      />

      {/* Charts section */}
      <SalesChart data={data.dailySales} loading={loading} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PaymentMethodsChart data={data.paymentMethods} loading={loading} />
        <TopProducts data={data.topProducts} loading={loading} />
      </div>

      <SellerReport data={data.sellers} loading={loading} />
    </div>
  );
}
