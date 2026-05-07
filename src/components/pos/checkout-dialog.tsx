'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Banknote,
  CreditCard,
  ArrowLeftRight,
  Smartphone,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatCOP, parseCOP } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { useCartStore } from '@/store/cart-store';
import { useAuth } from '@/hooks/use-auth';
import type { PaymentMethod, CartPayment } from '@/types/database';

const PAYMENT_METHODS: {
  method: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    method: 'efectivo',
    label: 'Efectivo',
    icon: <Banknote className="size-6" />,
    color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700',
  },
  {
    method: 'tarjeta',
    label: 'Tarjeta',
    icon: <CreditCard className="size-6" />,
    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700',
  },
  {
    method: 'transferencia',
    label: 'Transferencia',
    icon: <ArrowLeftRight className="size-6" />,
    color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700',
  },
  {
    method: 'nequi',
    label: 'Nequi',
    icon: <Smartphone className="size-6" />,
    color: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-700',
  },
  {
    method: 'daviplata',
    label: 'Daviplata',
    icon: <Smartphone className="size-6" />,
    color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700',
  },
];

const STANDARD_DISCOUNT = 3000;

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  onSaleComplete: (invoiceNumber: string, total: number) => void;
}

export function CheckoutDialog({
  open,
  onClose,
  onSaleComplete,
}: CheckoutDialogProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const ivaAmount = useCartStore((s) => s.ivaAmount);
  const total = useCartStore((s) => s.total);
  const payments = useCartStore((s) => s.payments);
  const totalPayments = useCartStore((s) => s.totalPayments);
  const addPayment = useCartStore((s) => s.addPayment);
  const removePayment = useCartStore((s) => s.removePayment);
  const clearPayments = useCartStore((s) => s.clearPayments);
  const customerName = useCartStore((s) => s.customerName);
  const customerIdNumber = useCartStore((s) => s.customerIdNumber);
  const customerPhone = useCartStore((s) => s.customerPhone);
  const customerEmail = useCartStore((s) => s.customerEmail);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const discountType = useCartStore((s) => s.discountType);
  const discountValue = useCartStore((s) => s.discountValue);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const notes = useCartStore((s) => s.notes);
  const setNotes = useCartStore((s) => s.setNotes);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [cashReceivedStr, setCashReceivedStr] = useState('');
  const [showCustomer, setShowCustomer] = useState(false);
  const [showCustomDiscount, setShowCustomDiscount] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalAmount = total(false, 0);
  const paidAmount = totalPayments();
  const remaining = Math.max(0, totalAmount - paidAmount);

  const cashChange = useMemo(() => {
    if (selectedMethod !== 'efectivo') return 0;
    const received = parseCOP(cashReceivedStr);
    return Math.max(0, received - remaining);
  }, [selectedMethod, cashReceivedStr, remaining]);

  const handleAddPayment = useCallback(() => {
    if (!selectedMethod) return;

    let amount: number;
    if (selectedMethod === 'efectivo' && cashReceivedStr) {
      amount = Math.min(parseCOP(cashReceivedStr), remaining);
    } else if (paymentAmountStr) {
      amount = Math.min(parseCOP(paymentAmountStr), remaining);
    } else {
      amount = remaining;
    }

    if (amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    addPayment({ method: selectedMethod, amount });
    setSelectedMethod(null);
    setPaymentAmountStr('');
    setCashReceivedStr('');
  }, [selectedMethod, paymentAmountStr, cashReceivedStr, remaining, addPayment]);

  const handleConfirmSale = async () => {
    if (!user) {
      toast.error('Debes iniciar sesion');
      return;
    }

    if (paidAmount < totalAmount) {
      toast.error('El monto pagado es insuficiente');
      return;
    }

    setLoading(true);

    try {
      // 1. Generate invoice number
      const { data: invoiceData, error: invoiceError } = await supabase.rpc(
        'generate_invoice_number'
      );
      if (invoiceError) throw new Error(`Error generando factura: ${invoiceError.message}`);
      const invoiceNumber = invoiceData as string;

      // 2. Insert sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          invoice_number: invoiceNumber,
          user_id: user.id,
          customer_name: customerName || null,
          customer_id_number: customerIdNumber || null,
          customer_phone: customerPhone || null,
          customer_email: customerEmail || null,
          subtotal: subtotal(),
          discount: discountAmount(),
          iva: 0,
          total: totalAmount,
          status: 'completada' as const,
          notes: notes.trim() || null,
        })
        .select('id')
        .single();

      if (saleError) throw new Error(`Error creando venta: ${saleError.message}`);

      // 3. Insert sale items
      const saleItems = items.map((item) => ({
        sale_id: sale.id,
        product_variant_id: item.variant.id,
        product_name: item.product.name,
        product_sku: item.product.sku,
        size: item.variant.size,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);
      if (itemsError) throw new Error(`Error guardando items: ${itemsError.message}`);

      // 4. Insert sale payments
      const salePayments = payments.map((p) => ({
        sale_id: sale.id,
        method: p.method,
        amount: p.amount,
      }));

      const { error: paymentsError } = await supabase
        .from('sale_payments')
        .insert(salePayments);
      if (paymentsError) throw new Error(`Error guardando pagos: ${paymentsError.message}`);

      // 5. Update stock for each variant (atomic decrement in DB)
      for (const item of items) {
        const { error: stockError } = await supabase.rpc('decrement_stock', {
          variant_id: item.variant.id,
          qty: item.quantity,
        });
        if (stockError)
          throw new Error(`Stock insuficiente: ${item.product.name} talla ${item.variant.size}`);
      }

      // 6. Insert inventory movements
      const movements = items.map((item) => ({
        product_variant_id: item.variant.id,
        type: 'venta' as const,
        quantity: -item.quantity,
        reason: `Venta ${invoiceNumber}`,
        user_id: user.id,
      }));

      const { error: movementsError } = await supabase
        .from('inventory_movements')
        .insert(movements);
      if (movementsError)
        throw new Error(`Error registrando movimientos: ${movementsError.message}`);

      toast.success('Venta registrada exitosamente');
      onSaleComplete(invoiceNumber, totalAmount);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-x-0 bottom-0 max-h-[95vh] bg-background rounded-t-2xl overflow-y-auto animate-in slide-in-from-bottom duration-300 safe-bottom">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-bold">Cobrar</h2>
          <button
            type="button"
            onClick={onClose}
            className="size-10 rounded-full flex items-center justify-center hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-5 pb-32">
          {/* Total prominente */}
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">Total a pagar</p>
            <p className="text-4xl font-bold">{formatCOP(totalAmount)}</p>
          </div>

          {/* Customer info (collapsible) */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCustomer(!showCustomer)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50"
            >
              <span>Datos del cliente (opcional)</span>
              {showCustomer ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
            {showCustomer && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomer('customerName', e.target.value)}
                    placeholder="Nombre del cliente"
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cedula</label>
                  <input
                    type="text"
                    value={customerIdNumber}
                    onChange={(e) => setCustomer('customerIdNumber', e.target.value)}
                    placeholder="Numero de cedula"
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Telefono</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomer('customerPhone', e.target.value)}
                    placeholder="3001234567"
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomer('customerEmail', e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de la venta…"
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Discount section */}
          <div className="border border-border rounded-xl px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Descuento</span>
              {discountAmount() > 0 && (
                <span className="text-green-600 text-sm font-semibold">
                  -{formatCOP(discountAmount())}
                </span>
              )}
            </div>

            {discountAmount() > 0 ? (
              <button
                type="button"
                onClick={() => { setDiscount('fixed', 0); setShowCustomDiscount(false); }}
                className="w-full h-11 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm font-medium flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
              >
                <X className="size-4" />
                Quitar descuento
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setDiscount('fixed', STANDARD_DISCOUNT); setShowCustomDiscount(false); }}
                  className="flex-1 h-11 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
                >
                  − {formatCOP(STANDARD_DISCOUNT)}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomDiscount(!showCustomDiscount)}
                  className="px-4 h-11 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Otro
                </button>
              </div>
            )}

            {showCustomDiscount && discountAmount() === 0 && (
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                placeholder="Valor del descuento"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                onChange={(e) => setDiscount('fixed', Number(e.target.value) || 0)}
              />
            )}
          </div>

          {/* Payment method selection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Metodo de pago</h3>

            {/* Existing payments */}
            {payments.length > 0 && (
              <div className="space-y-2">
                {payments.map((p, i) => {
                  const methodInfo = PAYMENT_METHODS.find(
                    (m) => m.method === p.method
                  );
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{methodInfo?.icon}</span>
                        <span className="text-sm font-medium">
                          {methodInfo?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatCOP(p.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePayment(i)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Remaining indicator */}
            {remaining > 0 && payments.length > 0 && (
              <p className="text-sm text-center text-orange-600 font-medium">
                Resta por pagar: {formatCOP(remaining)}
              </p>
            )}

            {/* Method buttons */}
            {remaining > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.method}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(pm.method);
                      setPaymentAmountStr('');
                      setCashReceivedStr('');
                    }}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border min-h-[72px] transition-colors active:scale-95 ${
                      selectedMethod === pm.method
                        ? pm.color + ' border-2'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {pm.icon}
                    <span className="text-xs font-medium">{pm.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Cash input / amount input */}
            {selectedMethod && remaining > 0 && (
              <div className="space-y-3 p-3 rounded-xl bg-muted/30 border border-border">
                {selectedMethod === 'efectivo' ? (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Monto recibido
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={cashReceivedStr}
                        onChange={(e) => setCashReceivedStr(e.target.value)}
                        placeholder={`Min: ${formatCOP(remaining)}`}
                        className="w-full h-12 px-3 rounded-lg border border-border bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                        autoFocus
                      />
                    </div>
                    {cashReceivedStr && parseCOP(cashReceivedStr) >= remaining && (
                      <div className="text-center py-2 rounded-lg bg-green-100 dark:bg-green-950">
                        <p className="text-sm text-muted-foreground">Cambio</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCOP(cashChange)}
                        </p>
                      </div>
                    )}
                    {/* Quick cash buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {[remaining, 50000, 100000, 200000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCashReceivedStr(String(val))}
                          className="px-3 py-2 rounded-lg bg-muted border border-border text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {formatCOP(val)}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Monto a pagar con{' '}
                      {PAYMENT_METHODS.find((m) => m.method === selectedMethod)?.label}
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={paymentAmountStr}
                      onChange={(e) => setPaymentAmountStr(e.target.value)}
                      placeholder={formatCOP(remaining)}
                      className="w-full h-12 px-3 rounded-lg border border-border bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                      autoFocus
                    />
                  </div>
                )}

                <Button
                  onClick={handleAddPayment}
                  className="w-full h-12 rounded-xl font-semibold"
                >
                  Agregar pago
                </Button>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-1 px-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCOP(subtotal())}</span>
            </div>
            {discountAmount() > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento</span>
                <span>-{formatCOP(discountAmount())}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1 border-t border-border">
              <span>Total</span>
              <span>{formatCOP(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pagado</span>
              <span className="font-medium">{formatCOP(paidAmount)}</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between text-sm text-orange-600 font-semibold">
                <span>Pendiente</span>
                <span>{formatCOP(remaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Confirm button - fixed at bottom */}
        <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3 safe-bottom">
          <Button
            onClick={handleConfirmSale}
            disabled={loading || paidAmount < totalAmount}
            className="w-full h-14 text-lg font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-5 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              'CONFIRMAR VENTA'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
