'use client';

import type { Sale, SaleItem, SalePayment, BusinessConfig } from '@/types/database';
import { formatCOP, formatDateTime } from '@/lib/format';

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
};

interface InvoiceHtmlProps {
  sale: Sale;
  business: BusinessConfig;
  items: SaleItem[];
  payments: SalePayment[];
  sellerName: string;
}

export function InvoiceHtml({
  sale,
  business,
  items,
  payments,
  sellerName,
}: InvoiceHtmlProps) {
  const hasCustomer = Boolean(sale.customer_name);
  const docTitle = hasCustomer ? 'FACTURA DE VENTA' : 'RECIBO DE CAJA';

  return (
    <div
      id="invoice-print-area"
      className="mx-auto max-w-[80mm] bg-white p-4 text-black font-mono text-xs"
    >
      {/* Business Header */}
      <div className="text-center mb-2">
        {business.logo_url && (
          <img
            src={business.logo_url}
            alt={business.name}
            className="mx-auto mb-2 h-12 object-contain"
          />
        )}
        <p className="font-bold text-sm uppercase">{business.name}</p>
        {business.nit && <p>NIT: {business.nit}</p>}
        {business.address && <p>{business.address}</p>}
        {business.city && <p>{business.city}</p>}
        {business.phone && <p>Tel: {business.phone}</p>}
      </div>

      <hr className="border-black border-dashed my-2" />

      {/* Document Title */}
      <div className="text-center mb-1">
        <p className="font-bold text-sm">{docTitle}</p>
        <p>No. {sale.invoice_number}</p>
        <p>Fecha: {formatDateTime(sale.created_at)}</p>
        {sellerName && <p>Vendedor/a: {sellerName}</p>}
      </div>

      <hr className="border-black border-dashed my-2" />

      {/* Customer Info */}
      {hasCustomer && (
        <>
          <div className="mb-1">
            <p className="font-bold">CLIENTE</p>
            {sale.customer_name && <p>Nombre: {sale.customer_name}</p>}
            {sale.customer_id_number && (
              <p>Cedula: {sale.customer_id_number}</p>
            )}
            {sale.customer_phone && <p>Tel: {sale.customer_phone}</p>}
          </div>
          <hr className="border-black border-dashed my-2" />
        </>
      )}

      {/* Items Table */}
      <table className="w-full text-[10px] mb-1">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Ref</th>
            <th className="text-left py-1">Descripcion</th>
            <th className="text-center py-1">Talla</th>
            <th className="text-center py-1">Cant</th>
            <th className="text-right py-1">P.Unit</th>
            <th className="text-right py-1">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-300">
              <td className="py-1">{item.product_sku}</td>
              <td className="py-1">{item.product_name}</td>
              <td className="text-center py-1">{item.size}</td>
              <td className="text-center py-1">{item.quantity}</td>
              <td className="text-right py-1">{formatCOP(item.unit_price)}</td>
              <td className="text-right py-1">{formatCOP(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="border-black border-dashed my-2" />

      {/* Totals */}
      <div className="space-y-1 mb-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCOP(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <span>Descuento:</span>
            <span>-{formatCOP(sale.discount)}</span>
          </div>
        )}
        {sale.iva > 0 && (
          <div className="flex justify-between">
            <span>IVA:</span>
            <span>{formatCOP(sale.iva)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base">
          <span>TOTAL:</span>
          <span>{formatCOP(sale.total)}</span>
        </div>
      </div>

      <hr className="border-black border-dashed my-2" />

      {/* Payments */}
      <div className="mb-1">
        <p className="font-bold mb-1">MEDIOS DE PAGO</p>
        {payments.map((payment) => (
          <div key={payment.id} className="flex justify-between">
            <span>{PAYMENT_LABELS[payment.method] || payment.method}</span>
            <span>{formatCOP(payment.amount)}</span>
          </div>
        ))}
      </div>

      <hr className="border-black border-dashed my-2" />

      {/* Notes */}
      {sale.notes && (
        <>
          <hr className="border-black border-dashed my-2" />
          <p className="font-bold mb-0.5">Notas:</p>
          <p className="text-[10px]">{sale.notes}</p>
        </>
      )}

      {/* Footer */}
      {business.footer_message && (
        <p className="text-center text-[9px] mb-1">{business.footer_message}</p>
      )}
      <p className="text-center font-bold text-xs mt-2">
        Gracias por su compra
      </p>
    </div>
  );
}
