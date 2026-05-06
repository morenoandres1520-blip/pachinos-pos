'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Product, ProductVariant, InventoryMovementType } from '@/types/database';

interface StockAdjustmentProps {
  product: Product;
  variants: ProductVariant[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function StockAdjustment({ product, variants, onSuccess, onCancel }: StockAdjustmentProps) {
  const supabase = createClient();
  const { user } = useAuth();

  const [variantId, setVariantId] = useState('');
  const [type, setType] = useState<InventoryMovementType>('entrada');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVariant = variants.find((v) => v.id === variantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!variantId) { setError('Selecciona una talla.'); return; }
    if (!reason.trim()) { setError('El motivo es obligatorio.'); return; }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) { setError('La cantidad debe ser mayor a 0.'); return; }

    if (!selectedVariant) return;

    if (type === 'salida' && qty > selectedVariant.stock) {
      setError(`Solo hay ${selectedVariant.stock} unidades disponibles.`);
      return;
    }

    setSaving(true);
    try {
      let newStock = selectedVariant.stock;
      if (type === 'entrada') newStock += qty;
      else if (type === 'salida') newStock -= qty;
      else if (type === 'correccion') newStock = qty;

      const { error: stockError } = await supabase
        .from('product_variants')
        .update({ stock: newStock })
        .eq('id', variantId);

      if (stockError) throw stockError;

      const movementQty =
        type === 'correccion' ? qty - selectedVariant.stock : type === 'salida' ? -qty : qty;

      await supabase.from('inventory_movements').insert({
        product_variant_id: variantId,
        type,
        quantity: movementQty,
        reason: reason.trim(),
        user_id: user?.id,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ajustar el inventario.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">{product.name} · {product.sku}</p>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Talla</Label>
        <Select value={variantId} onValueChange={setVariantId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar talla…" />
          </SelectTrigger>
          <SelectContent>
            {variants.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                Talla {v.size} — Stock actual: {v.stock}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Tipo de movimiento</Label>
        <Select value={type} onValueChange={(v) => setType(v as InventoryMovementType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entrada">Entrada (sumar stock)</SelectItem>
            <SelectItem value="salida">Salida (restar stock)</SelectItem>
            <SelectItem value="correccion">Corrección (fijar stock)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>
          {type === 'correccion' ? 'Nuevo stock total' : 'Cantidad'}
        </Label>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={type === 'correccion' ? 'Ej. 10' : 'Ej. 5'}
        />
        {selectedVariant && type !== 'correccion' && (
          <p className="text-xs text-muted-foreground">
            Stock actual: {selectedVariant.stock} →{' '}
            {type === 'entrada'
              ? selectedVariant.stock + (parseInt(quantity, 10) || 0)
              : selectedVariant.stock - (parseInt(quantity, 10) || 0)}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Motivo</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe el motivo del ajuste…"
          rows={2}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</>
          ) : (
            'Guardar ajuste'
          )}
        </Button>
      </div>
    </form>
  );
}
