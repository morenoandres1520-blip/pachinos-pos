'use client';

import { useMemo } from 'react';
import { Printer, Share2, XCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCOP, formatDateTime } from '@/lib/format';
import type { Sale, PaymentMethod } from '@/types/database';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
};

interface SaleDetailProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetail({ sale, open, onOpenChange }: SaleDetailProps) {
  const isVoided = sale?.status === 'anulada';

  const whatsappMessage = useMemo(() => {
    if (!sale) return '';
    const lines = [
      `*Factura ${sale.invoice_number}*`,
      `Fecha: ${formatDateTime(sale.created_at)}`,
      '',
      '*Productos:*',
      ...(sale.items ?? []).map(
        (item) =>
          `- ${item.product_name} (${item.size}) x${item.quantity} = ${formatCOP(item.subtotal)}`
      ),
      '',
      `Subtotal: ${formatCOP(sale.subtotal)}`,
    ];
    if (sale.discount > 0) lines.push(`Descuento: -${formatCOP(sale.discount)}`);
    if (sale.iva > 0) lines.push(`IVA: ${formatCOP(sale.iva)}`);
    lines.push(`*Total: ${formatCOP(sale.total)}*`);
    return encodeURIComponent(lines.join('\n'));
  }, [sale]);

  if (!sale) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle>Factura {sale.invoice_number}</SheetTitle>
            <Badge variant={isVoided ? 'destructive' : 'success'}>
              {isVoided ? 'Anulada' : 'Completada'}
            </Badge>
          </div>
          <SheetDescription>{formatDateTime(sale.created_at)}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 pb-6 space-y-5">
            {/* Seller & Customer info */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Vendedor
              </h4>
              <p className="text-sm">{sale.user?.full_name ?? 'N/A'}</p>
            </div>

            {(sale.customer_name || sale.customer_id_number || sale.customer_phone || sale.customer_email) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Cliente
                </h4>
                {sale.customer_name && (
                  <p className="text-sm">{sale.customer_name}</p>
                )}
                {sale.customer_id_number && (
                  <p className="text-sm text-muted-foreground">
                    CC/NIT: {sale.customer_id_number}
                  </p>
                )}
                {sale.customer_phone && (
                  <p className="text-sm text-muted-foreground">
                    Tel: {sale.customer_phone}
                  </p>
                )}
                {sale.customer_email && (
                  <p className="text-sm text-muted-foreground">
                    {sale.customer_email}
                  </p>
                )}
              </div>
            )}

            <Separator />

            {/* Items */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Productos
              </h4>
              <div className="space-y-3">
                {(sale.items ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Talla {item.size} &middot; {item.quantity} x{' '}
                        {formatCOP(item.unit_price)}
                      </p>
                    </div>
                    <p className="text-sm font-medium shrink-0">
                      {formatCOP(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Payment methods */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Metodos de pago
              </h4>
              <div className="space-y-2">
                {(sale.payments ?? []).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between"
                  >
                    <p className="text-sm">
                      {PAYMENT_LABELS[payment.method] ?? payment.method}
                    </p>
                    <p className="text-sm font-medium">
                      {formatCOP(payment.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCOP(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Descuento</span>
                  <span className="text-destructive">
                    -{formatCOP(sale.discount)}
                  </span>
                </div>
              )}
              {sale.iva > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA</span>
                  <span>{formatCOP(sale.iva)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCOP(sale.total)}</span>
              </div>
            </div>

            {/* Void reason */}
            {isVoided && sale.void_reason && (
              <>
                <Separator />
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="size-4" />
                    <h4 className="text-sm font-medium">Venta anulada</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sale.void_reason}
                  </p>
                </div>
              </>
            )}

            {/* Notes */}
            {sale.notes && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Notas
                </h4>
                <p className="text-sm">{sale.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action buttons */}
        <div className="border-t p-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 min-h-[44px]"
            onClick={() => {
              window.print();
            }}
          >
            <Printer className="size-4 mr-2" />
            Reimprimir Factura
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-h-[44px]"
            onClick={() => {
              const phone = sale.customer_phone
                ? sale.customer_phone.replace(/\D/g, '')
                : '';
              const url = `https://wa.me/${phone}?text=${whatsappMessage}`;
              window.open(url, '_blank');
            }}
          >
            <Share2 className="size-4 mr-2" />
            Compartir WhatsApp
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
