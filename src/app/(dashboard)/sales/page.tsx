'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  CalendarDays,
  ShoppingBag,
  Loader2,
  ShieldAlert,
  Ban,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCOP, formatDateTime } from '@/lib/format';
import { SaleDetail } from '@/components/pos/sale-detail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import type { Sale, PaymentMethod, SaleStatus } from '@/types/database';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type RangePreset = 'today' | 'week' | 'month' | 'custom';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBogotaDateRange(
  preset: RangePreset,
  customStart?: string,
  customEnd?: string,
): { start: string; end: string } {
  const now = new Date();
  const bogotaOffset = -5 * 60; // UTC-5 in minutes
  const utcOffset = now.getTimezoneOffset();
  const diff = bogotaOffset - utcOffset; // minutes to add to local time to get Bogota
  const bogotaNow = new Date(now.getTime() + diff * 60 * 1000);

  if (preset === 'custom' && customStart && customEnd) {
    const s = new Date(customStart + 'T00:00:00');
    const e = new Date(customEnd + 'T23:59:59.999');
    return {
      start: new Date(s.getTime() - diff * 60 * 1000).toISOString(),
      end: new Date(e.getTime() - diff * 60 * 1000).toISOString(),
    };
  }

  let start: Date;
  let end: Date;

  switch (preset) {
    case 'today': {
      start = new Date(bogotaNow);
      start.setHours(0, 0, 0, 0);
      end = new Date(bogotaNow);
      end.setHours(23, 59, 59, 999);
      break;
    }
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
    case 'month': {
      start = new Date(bogotaNow.getFullYear(), bogotaNow.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(bogotaNow);
      end.setHours(23, 59, 59, 999);
      break;
    }
    default: {
      start = new Date(bogotaNow);
      start.setHours(0, 0, 0, 0);
      end = new Date(bogotaNow);
      end.setHours(23, 59, 59, 999);
    }
  }

  return {
    start: new Date(start.getTime() - diff * 60 * 1000).toISOString(),
    end: new Date(end.getTime() - diff * 60 * 1000).toISOString(),
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SaleCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
    </Card>
  );
}

interface SummaryBarProps {
  count: number;
  revenue: number;
  loading: boolean;
}

function SummaryBar({ count, revenue, loading }: SummaryBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="p-3 bg-amber-50 border-amber-200">
        <p className="text-xs text-amber-700 font-medium">Ventas</p>
        {loading ? (
          <Skeleton className="h-6 w-12 mt-1" />
        ) : (
          <p className="text-xl font-bold text-amber-900">{count}</p>
        )}
      </Card>
      <Card className="p-3 bg-amber-50 border-amber-200">
        <p className="text-xs text-amber-700 font-medium">Total ingresos</p>
        {loading ? (
          <Skeleton className="h-6 w-28 mt-1" />
        ) : (
          <p className="text-xl font-bold text-amber-900 truncate">{formatCOP(revenue)}</p>
        )}
      </Card>
    </div>
  );
}

interface SaleCardProps {
  sale: Sale;
  onSelect: (sale: Sale) => void;
  onVoid: (sale: Sale) => void;
  canVoid: boolean;
}

function SaleCard({ sale, onSelect, onVoid, canVoid }: SaleCardProps) {
  const isAnulada = sale.status === 'anulada';
  const primaryPayment = sale.payments?.[0];

  return (
    <Card
      className="p-4 cursor-pointer active:scale-[0.99] transition-transform hover:shadow-md border border-border"
      onClick={() => onSelect(sale)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-foreground">
            #{sale.invoice_number}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDateTime(sale.created_at)}
          </p>
        </div>
        <Badge variant={isAnulada ? 'destructive' : 'success'}>
          {isAnulada ? 'Anulada' : 'Completada'}
        </Badge>
      </div>

      <Separator className="my-2" />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate flex-1">
            {sale.customer_name ?? 'Cliente general'}
          </p>
          {primaryPayment && (
            <Badge variant="outline" className="text-xs shrink-0">
              {PAYMENT_LABELS[primaryPayment.method] ?? primaryPayment.method}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {sale.user?.full_name ?? '—'}
          </p>
          <p className="font-bold text-sm text-foreground">
            {formatCOP(sale.total)}
          </p>
        </div>
      </div>

      {canVoid && !isAnulada && (
        <div className="mt-3 pt-2 border-t border-dashed border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive min-h-[36px]"
            onClick={(e) => {
              e.stopPropagation();
              onVoid(sale);
            }}
          >
            <Ban className="size-3.5 mr-1.5" />
            Anular venta
          </Button>
        </div>
      )}
    </Card>
  );
}

// ─── Void Confirmation Dialog ────────────────────────────────────────────────

interface VoidDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (saleId: string, reason: string) => Promise<void>;
  loading: boolean;
}

function VoidDialog({ sale, open, onOpenChange, onConfirm, loading }: VoidDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = async () => {
    if (!sale) return;
    await onConfirm(sale.id, reason.trim());
    setReason('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setReason('');
    onOpenChange(nextOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Anular venta</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas anular la factura{' '}
            <span className="font-semibold text-foreground">
              #{sale?.invoice_number}
            </span>
            ? Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-2 space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Motivo de anulación
          </label>
          <Input
            placeholder="Ej: Error en los productos, devolución..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Ban className="size-4 mr-2" />
            )}
            Confirmar anulación
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface SalesRow {
  id: string;
  invoice_number: string;
  user_id: string;
  customer_name: string | null;
  customer_id_number: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  subtotal: number;
  discount: number;
  iva: number;
  total: number;
  status: SaleStatus;
  notes: string | null;
  void_reason: string | null;
  created_at: string;
  user: { id: string; full_name: string; email: string } | null;
}

export default function SalesPage() {
  const { user, loading: authLoading } = useAuth();
  const { canViewAllSales, canVoidSales, loading: permLoading } = usePermissions();

  const supabase = useMemo(() => createClient(), []);

  // ── Filters ──
  const [rangePreset, setRangePreset] = useState<RangePreset>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ── Sales state ──
  const [sales, setSales] = useState<Sale[]>([]);
  const [summaryCount, setSummaryCount] = useState(0);
  const [summaryRevenue, setSummaryRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // ── Detail sheet ──
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Void dialog ──
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidLoading, setVoidLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0);
    setSales([]);
  }, [rangePreset, customStart, customEnd, debouncedSearch]);

  // ── Fetch sales ───────────────────────────────────────────────────────────

  const fetchSales = useCallback(
    async (pageIndex: number, replace: boolean) => {
      if (!user) return;

      const isFirstPage = pageIndex === 0;
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);

      try {
        const { start, end } = getBogotaDateRange(rangePreset, customStart, customEnd);
        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from('sales')
          .select(
            `
            id,
            invoice_number,
            user_id,
            customer_name,
            customer_id_number,
            customer_phone,
            customer_email,
            subtotal,
            discount,
            iva,
            total,
            status,
            notes,
            void_reason,
            created_at,
            user:profiles!sales_user_id_fkey(id, full_name, email),
            items:sale_items(
              id,
              sale_id,
              product_variant_id,
              product_name,
              product_sku,
              size,
              quantity,
              unit_price,
              subtotal
            ),
            payments:sale_payments(id, sale_id, method, amount)
          `,
            { count: 'exact' },
          )
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false })
          .range(from, to);

        // RBAC: non-admin only sees own sales
        if (!canViewAllSales) {
          query = query.eq('user_id', user.id);
        }

        // Search filter
        if (debouncedSearch.trim()) {
          const term = debouncedSearch.trim();
          query = query.or(
            `invoice_number.ilike.%${term}%,customer_name.ilike.%${term}%`,
          );
        }

        const { data, error, count } = await query;

        if (error) {
          console.error('Error fetching sales:', error);
          if (replace) setSales([]);
          return;
        }

        const rows = (data ?? []) as unknown as SalesRow[];

        const mapped: Sale[] = rows.map((row) => ({
          id: row.id,
          invoice_number: row.invoice_number,
          user_id: row.user_id,
          customer_name: row.customer_name,
          customer_id_number: row.customer_id_number,
          customer_phone: row.customer_phone,
          customer_email: row.customer_email,
          subtotal: row.subtotal,
          discount: row.discount,
          iva: row.iva,
          total: row.total,
          status: row.status,
          notes: row.notes,
          void_reason: row.void_reason,
          created_at: row.created_at,
          user: row.user
            ? {
                id: row.user.id,
                full_name: row.user.full_name,
                email: row.user.email,
                role: 'cajera',
                is_active: true,
                created_at: '',
              }
            : undefined,
          items: (row as Sale & { items?: Sale['items'] }).items,
          payments: (row as Sale & { payments?: Sale['payments'] }).payments,
        }));

        setSales((prev) => (replace ? mapped : [...prev, ...mapped]));
        setHasMore((count ?? 0) > from + mapped.length);

        // Summary (only recalculate on first page load to reflect full filtered set)
        if (isFirstPage) {
          // Fetch aggregate totals separately for summary bar
          let summaryQuery = supabase
            .from('sales')
            .select('total', { count: 'exact', head: false })
            .eq('status', 'completada')
            .gte('created_at', start)
            .lte('created_at', end);

          if (!canViewAllSales) {
            summaryQuery = summaryQuery.eq('user_id', user.id);
          }

          if (debouncedSearch.trim()) {
            const term = debouncedSearch.trim();
            summaryQuery = summaryQuery.or(
              `invoice_number.ilike.%${term}%,customer_name.ilike.%${term}%`,
            );
          }

          const { data: summaryData, count: summaryTotal } = await summaryQuery;
          setSummaryCount(summaryTotal ?? 0);
          setSummaryRevenue(
            (summaryData ?? []).reduce(
              (acc: number, s: { total: number }) => acc + (s.total ?? 0),
              0,
            ),
          );
        }
      } catch (err) {
        console.error('Unexpected error fetching sales:', err);
        if (replace) setSales([]);
      } finally {
        if (isFirstPage) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [supabase, user, canViewAllSales, rangePreset, customStart, customEnd, debouncedSearch],
  );

  useEffect(() => {
    if (!authLoading && !permLoading && user) {
      fetchSales(0, true);
    }
  }, [authLoading, permLoading, user, fetchSales]);

  // ── Load more ─────────────────────────────────────────────────────────────

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchSales(nextPage, false);
        }
      },
      { threshold: 0.5 },
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, loadingMore, loading, page, fetchSales]);

  // ── Sale detail ───────────────────────────────────────────────────────────

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailOpen(true);
  };

  // ── Void sale ─────────────────────────────────────────────────────────────

  const handleVoidSale = (sale: Sale) => {
    setVoidTarget(sale);
    setVoidOpen(true);
  };

  const confirmVoid = async (saleId: string, reason: string) => {
    setVoidLoading(true);
    try {
      // 1. Fetch the sale items to know what stock to restore
      const { data: items, error: itemsError } = await supabase
        .from('sale_items')
        .select('product_variant_id, quantity')
        .eq('sale_id', saleId);

      if (itemsError) {
        toast.error('Error al obtener los ítems de la venta');
        return;
      }

      // 2. Mark sale as anulada
      const { error } = await supabase
        .from('sales')
        .update({ status: 'anulada', void_reason: reason || null })
        .eq('id', saleId);

      if (error) {
        toast.error('Error al anular la venta', { description: error.message });
        return;
      }

      // 3. Restore stock and log inventory movements
      for (const item of items ?? []) {
        await supabase.rpc('increment_stock', {
          variant_id: item.product_variant_id,
          qty: item.quantity,
        });

        await supabase.from('inventory_movements').insert({
          product_variant_id: item.product_variant_id,
          type: 'anulacion',
          quantity: item.quantity,
          reason: `Anulación venta — ${reason || 'sin motivo'}`,
          user_id: user?.id,
        });
      }

      // Update local state
      setSales((prev) =>
        prev.map((s) =>
          s.id === saleId
            ? { ...s, status: 'anulada' as SaleStatus, void_reason: reason || null }
            : s,
        ),
      );

      // Update detail if open
      if (selectedSale?.id === saleId) {
        setSelectedSale((prev) =>
          prev ? { ...prev, status: 'anulada', void_reason: reason || null } : prev,
        );
      }

      toast.success('Venta anulada y stock restaurado');
      setVoidOpen(false);
      setVoidTarget(null);

      // Refresh summary to reflect the anulada change
      const { start, end } = getBogotaDateRange(rangePreset, customStart, customEnd);
      let summaryQuery = supabase
        .from('sales')
        .select('total', { count: 'exact', head: false })
        .eq('status', 'completada')
        .gte('created_at', start)
        .lte('created_at', end);

      if (!canViewAllSales) {
        summaryQuery = summaryQuery.eq('user_id', user!.id);
      }

      const { data: summaryData, count: summaryTotal } = await summaryQuery;
      setSummaryCount(summaryTotal ?? 0);
      setSummaryRevenue(
        (summaryData ?? []).reduce(
          (acc: number, s: { total: number }) => acc + (s.total ?? 0),
          0,
        ),
      );
    } catch (err) {
      console.error('Unexpected error voiding sale:', err);
    } finally {
      setVoidLoading(false);
    }
  };

  // ── Render guards ─────────────────────────────────────────────────────────

  if (authLoading || permLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-amber-700" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
        <ShieldAlert className="size-12 text-amber-400" />
        <p className="text-sm text-muted-foreground text-center">
          Debes iniciar sesión para ver las ventas.
        </p>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 px-4 py-4 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-amber-900">Ventas</h2>
        <p className="text-sm text-muted-foreground">
          {canViewAllSales
            ? 'Historial de todas las ventas'
            : 'Historial de tus ventas'}
        </p>
      </div>

      <Separator className="bg-amber-200" />

      {/* Filters */}
      <div className="space-y-3">
        {/* Date range */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-amber-700 shrink-0" />
            <span className="text-sm font-medium">Periodo</span>
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
                <label className="mb-1 block text-xs text-muted-foreground">
                  Desde
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Hasta
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar por # factura o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Summary bar */}
      <SummaryBar
        count={summaryCount}
        revenue={summaryRevenue}
        loading={loading}
      />

      {/* Sales list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SaleCardSkeleton key={i} />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <ShoppingBag className="size-12 text-amber-300" />
          <p className="text-base font-medium text-foreground">
            Sin ventas
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            No se encontraron ventas para el periodo y filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              onSelect={handleSelectSale}
              onVoid={handleVoidSale}
              canVoid={canVoidSales}
            />
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="flex justify-center py-2">
            {loadingMore ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Cargando más...
              </div>
            ) : hasMore ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronDown className="size-3.5" />
                Desplaza para cargar más
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {sales.length === 1
                  ? '1 venta mostrada'
                  : `${sales.length} ventas mostradas`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sale Detail Sheet */}
      <SaleDetail
        sale={selectedSale}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Void Confirmation Dialog */}
      <VoidDialog
        sale={voidTarget}
        open={voidOpen}
        onOpenChange={setVoidOpen}
        onConfirm={confirmVoid}
        loading={voidLoading}
      />
    </div>
  );
}
