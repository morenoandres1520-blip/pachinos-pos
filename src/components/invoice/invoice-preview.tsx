'use client';

import { useState } from 'react';
import { Download, Printer, Share2, X } from 'lucide-react';
import type { Sale, SaleItem, SalePayment, BusinessConfig } from '@/types/database';
import { formatCOP, formatDateTime } from '@/lib/format';
import { generateInvoicePDF } from '@/lib/pdf/generate-invoice';
import { InvoiceHtml } from '@/components/invoice/invoice-html';
import { PrintStyles } from '@/components/invoice/print-styles';
import { Button } from '@/components/ui/button';

interface InvoicePreviewProps {
  open: boolean;
  onClose: () => void;
  sale: Sale;
  business: BusinessConfig;
  items: SaleItem[];
  payments: SalePayment[];
  sellerName: string;
}

export function InvoicePreview({
  open,
  onClose,
  sale,
  business,
  items,
  payments,
  sellerName,
}: InvoicePreviewProps) {
  const [downloading, setDownloading] = useState(false);

  if (!open) return null;

  const handleDownload = () => {
    setDownloading(true);
    try {
      const doc = generateInvoicePDF(sale, business, items, payments, sellerName);
      doc.save(`factura-${sale.invoice_number}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const message = `Factura PaChinos No. ${sale.invoice_number}\nTotal: ${formatCOP(sale.total)}\nFecha: ${formatDateTime(sale.created_at)}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <PrintStyles />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet / Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3" data-no-print>
          <h2 className="text-lg font-semibold">Vista previa de factura</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-b px-4 py-2" data-no-print>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1"
          >
            <Download className="size-4 mr-1" data-icon="inline-start" />
            Descargar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex-1"
          >
            <Printer className="size-4 mr-1" data-icon="inline-start" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsApp}
            className="flex-1"
          >
            <Share2 className="size-4 mr-1" data-icon="inline-start" />
            WhatsApp
          </Button>
        </div>

        {/* Invoice preview — scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <div className="rounded-lg shadow-sm border">
            <InvoiceHtml
              sale={sale}
              business={business}
              items={items}
              payments={payments}
              sellerName={sellerName}
            />
          </div>
        </div>
      </div>
    </>
  );
}
