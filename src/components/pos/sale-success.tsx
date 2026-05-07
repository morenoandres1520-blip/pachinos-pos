'use client';

import { useState, useCallback, useEffect } from 'react';
import { CheckCircle, Plus, Download, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatCOP, formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { generateInvoicePDF } from '@/lib/pdf/generate-invoice';
import type { Sale, SaleItem, SalePayment, BusinessConfig } from '@/types/database';

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
};

interface SaleSuccessProps {
  invoiceNumber: string;
  total: number;
  customerPhone?: string;
  onNewSale: () => void;
}

interface SaleData {
  sale: Sale;
  items: SaleItem[];
  payments: SalePayment[];
  config: BusinessConfig;
  sellerName: string;
}

function formatColombianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('57') && digits.length === 12) return digits;
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

export function SaleSuccess({
  invoiceNumber,
  total,
  customerPhone,
  onNewSale,
}: SaleSuccessProps) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingWa, setLoadingWa] = useState(false);
  const [cachedData, setCachedData] = useState<SaleData | null>(null);

  const fetchSaleData = useCallback(async (): Promise<SaleData> => {
    if (cachedData) return cachedData;

    const supabase = createClient();

    const [saleRes, configRes] = await Promise.all([
      supabase
        .from('sales')
        .select(`*, items:sale_items(*), payments:sale_payments(*), seller:profiles!sales_user_id_fkey(full_name)`)
        .eq('invoice_number', invoiceNumber)
        .single(),
      supabase.from('business_config').select('*').limit(1).single(),
    ]);

    if (saleRes.error) throw new Error(saleRes.error.message);
    if (configRes.error) throw new Error(configRes.error.message);

    const raw = saleRes.data as Sale & {
      items: SaleItem[];
      payments: SalePayment[];
      seller: { full_name: string } | null;
    };

    const result: SaleData = {
      sale: raw,
      items: raw.items ?? [],
      payments: raw.payments ?? [],
      config: configRes.data as BusinessConfig,
      sellerName: raw.seller?.full_name ?? '',
    };
    setCachedData(result);
    return result;
  }, [invoiceNumber, cachedData]);

  // Pre-fetch sale data silently on mount so buttons respond instantly
  useEffect(() => {
    fetchSaleData().catch(() => {});
  }, [fetchSaleData]);

  const handleDownloadPDF = async () => {
    setLoadingPdf(true);
    try {
      const { sale, items, payments, config, sellerName } = await fetchSaleData();
      const doc = generateInvoicePDF(sale, config, items, payments, sellerName);
      doc.save(`${invoiceNumber}.pdf`);
    } catch {
      toast.error('No se pudo generar el PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleWhatsApp = async () => {
    setLoadingWa(true);
    try {
      const { sale, items, payments } = await fetchSaleData();

      const itemsText = items
        .map((i) => `• ${i.product_name} T.${i.size} x${i.quantity} — ${formatCOP(i.subtotal)}`)
        .join('\n');

      const paymentsText = payments
        .map((p) => `• ${PAYMENT_LABELS[p.method] ?? p.method}: ${formatCOP(p.amount)}`)
        .join('\n');

      const discountLine = sale.discount > 0 ? `Descuento: -${formatCOP(sale.discount)}\n` : '';

      const message = encodeURIComponent(
        `🛍️ *PaChinos Calzado*\n\n` +
        `Factura: *${invoiceNumber}*\n` +
        `Fecha: ${formatDateTime(sale.created_at)}\n\n` +
        `*Productos:*\n${itemsText}\n\n` +
        `${discountLine}` +
        `*Total: ${formatCOP(total)}*\n\n` +
        `*Forma de pago:*\n${paymentsText}\n\n` +
        `¡Gracias por tu compra! 👟`
      );

      const phone = customerPhone ? formatColombianPhone(customerPhone) : '';
      const url = phone
        ? `https://wa.me/${phone}?text=${message}`
        : `https://wa.me/?text=${message}`;
      window.open(url, '_blank');
    } catch {
      // Fallback a mensaje básico si falla el fetch
      const message = encodeURIComponent(
        `🛍️ *PaChinos Calzado*\n\nFactura: *${invoiceNumber}*\nTotal: *${formatCOP(total)}*\n\n¡Gracias por tu compra! 👟`
      );
      const phone = customerPhone ? formatColombianPhone(customerPhone) : '';
      const url = phone
        ? `https://wa.me/${phone}?text=${message}`
        : `https://wa.me/?text=${message}`;
      window.open(url, '_blank');
    } finally {
      setLoadingWa(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Ícono de éxito */}
        <div className="flex justify-center">
          <div className="size-20 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
            <CheckCircle className="size-12 text-green-600" />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-green-600">Venta exitosa</h2>
          <p className="text-4xl font-bold">{formatCOP(total)}</p>
          <p className="text-muted-foreground text-sm">
            Factura N.{' '}
            <span className="font-mono font-bold text-foreground text-base">
              {invoiceNumber}
            </span>
          </p>
        </div>

        {/* Acciones */}
        <div className="space-y-3">
          <Button
            onClick={onNewSale}
            className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90"
          >
            <Plus className="size-5" />
            Nueva Venta
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={loadingPdf}
              className="h-12 rounded-xl"
            >
              {loadingPdf ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {loadingPdf ? 'Generando…' : 'Descargar PDF'}
            </Button>

            <Button
              variant="outline"
              onClick={handleWhatsApp}
              disabled={loadingWa}
              className="h-12 rounded-xl text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
            >
              {loadingWa ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageCircle className="size-4" />
              )}
              {loadingWa ? 'Cargando…' : 'WhatsApp'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
