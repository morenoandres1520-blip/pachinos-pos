'use client';

import { CheckCircle, FileText, MessageCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCOP } from '@/lib/format';

interface SaleSuccessProps {
  invoiceNumber: string;
  total: number;
  customerPhone?: string;
  onNewSale: () => void;
  onViewInvoice: () => void;
}

export function SaleSuccess({
  invoiceNumber,
  total,
  customerPhone,
  onNewSale,
  onViewInvoice,
}: SaleSuccessProps) {
  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Gracias por su compra en PaChinos!\n\nFactura: ${invoiceNumber}\nTotal: ${formatCOP(total)}\n\nLo esperamos pronto!`
    );
    const phoneParam = customerPhone
      ? customerPhone.replace(/\D/g, '')
      : '';
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="size-20 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
            <CheckCircle className="size-12 text-green-600" />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-green-600">
            Venta exitosa
          </h2>
          <p className="text-4xl font-bold">{formatCOP(total)}</p>
          <p className="text-muted-foreground text-sm">
            Factura N.{' '}
            <span className="font-mono font-bold text-foreground text-base">
              {invoiceNumber}
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onNewSale}
            className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90"
          >
            <Plus className="size-5 mr-2" />
            Nueva Venta
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onViewInvoice}
              className="flex-1 h-12 rounded-xl"
            >
              <FileText className="size-4 mr-2" />
              Ver Factura
            </Button>

            <Button
              variant="outline"
              onClick={handleWhatsApp}
              className="flex-1 h-12 rounded-xl text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
            >
              <MessageCircle className="size-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
