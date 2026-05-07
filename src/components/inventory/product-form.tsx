'use client';

import { useState, useRef, useId, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Loader2, Upload, X, ImageIcon } from 'lucide-react';
import { formatCOP } from '@/lib/format';
import type { Product } from '@/types/database';

type Material = 'cuero' | 'sintético' | 'tela' | 'otro';

const MATERIALS: { value: Material; label: string }[] = [
  { value: 'cuero', label: 'Cuero' },
  { value: 'sintético', label: 'Sintético' },
  { value: 'tela', label: 'Tela' },
  { value: 'otro', label: 'Otro' },
];

const SHOE_SIZES: number[] = Array.from({ length: 13 }, (_, i) => 34 + i);
const STORAGE_BUCKET = 'images';

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormFields {
  name: string;
  sku: string;
  category: string;
  brand: string;
  color: string;
  material: Material | '';
  price_cost: string;
  price_sale: string;
  is_active: boolean;
}

type FormErrors = Partial<Record<keyof FormFields | 'image' | 'submit', string>>;

function parseCOP(raw: string): number {
  return parseInt(raw.replace(/\D/g, ''), 10) || 0;
}

function formatInputCOP(raw: string): string {
  const n = parseCOP(raw);
  return n === 0 ? '' : formatCOP(n);
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const supabase = createClient();
  const isEditMode = product != null;
  const formId = useId();

  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      const [catRes, brandRes] = await Promise.all([
        supabase.from('categories').select('name').order('name'),
        supabase.from('brands').select('name').order('name'),
      ]);
      if (catRes.data) setCategories(catRes.data.map((c) => c.name));
      if (brandRes.data) setBrands(brandRes.data.map((b) => b.name));
    };
    loadOptions();
  }, []);

  const [fields, setFields] = useState<FormFields>({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category: product?.category ?? '',
    brand: product?.brand ?? '',
    color: product?.color ?? '',
    material: (product?.material as Material) ?? '',
    price_cost: product?.cost_price ? formatCOP(product.cost_price) : '',
    price_sale: product?.sale_price ? formatCOP(product.sale_price) : '',
    is_active: product?.is_active ?? true,
  });

  const [sizeStock, setSizeStock] = useState<Map<number, number>>(
    () => new Map(SHOE_SIZES.map((s) => [s, 0]))
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function setField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handlePriceBlur(key: 'price_cost' | 'price_sale') {
    setField(key, formatInputCOP(fields[key]));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'El archivo debe ser una imagen.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'La imagen no debe superar 5 MB.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, image: undefined }));
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(isEditMode ? (product?.image_url ?? null) : null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSizeStockChange(size: number, raw: string) {
    const qty = Math.max(0, parseInt(raw, 10) || 0);
    setSizeStock((prev) => new Map(prev).set(size, qty));
  }

  function validate(): boolean {
    const next: FormErrors = {};

    if (!fields.name.trim()) next.name = 'El nombre es obligatorio.';
    if (!fields.sku.trim()) next.sku = 'El SKU es obligatorio.';
    if (!fields.category) next.category = 'Selecciona una categoría.';
    if (!fields.material) next.material = 'Selecciona el material.';

    const cost = parseCOP(fields.price_cost);
    const sale = parseCOP(fields.price_sale);
    if (cost <= 0) next.price_cost = 'Ingresa un precio de costo válido.';
    if (sale <= 0) next.price_sale = 'Ingresa un precio de venta válido.';
    if (sale > 0 && cost > 0 && sale < cost)
      next.price_sale = 'El precio de venta no debe ser menor al costo.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });

    if (error) throw new Error(`Error al subir imagen: ${error.message}`);

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      let imageUrl: string | null = product?.image_url ?? null;
      if (imageFile) imageUrl = await uploadImage(imageFile);

      const payload = {
        name: fields.name.trim(),
        sku: fields.sku.trim().toUpperCase(),
        category: fields.category,
        brand: fields.brand.trim() || null,
        color: fields.color.trim() || null,
        material: fields.material as Material,
        cost_price: parseCOP(fields.price_cost),
        sale_price: parseCOP(fields.price_sale),
        is_active: fields.is_active,
        image_url: imageUrl,
      };

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id);

        if (updateError) throw new Error(updateError.message);
      } else {
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert(payload)
          .select('id')
          .single();

        if (insertError || !newProduct) {
          throw new Error(insertError?.message ?? 'Error al crear el producto.');
        }

        const variantsToInsert = SHOE_SIZES
          .filter((size) => (sizeStock.get(size) ?? 0) > 0)
          .map((size) => ({
            product_id: (newProduct as { id: string }).id,
            size: String(size),
            stock: sizeStock.get(size) ?? 0,
          }));

        if (variantsToInsert.length > 0) {
          const { error: variantError } = await supabase
            .from('product_variants')
            .insert(variantsToInsert);

          if (variantError) throw new Error(variantError.message);
        }
      }

      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
      setErrors({ submit: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-5">
      {errors.submit && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex gap-2 items-start">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          {errors.submit}
        </div>
      )}

      {/* Información general */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Información general
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-name`}>
            Nombre <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${formId}-name`}
            value={fields.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Ej. Botín de cuero dama"
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-sku`}>
            SKU <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${formId}-sku`}
            value={fields.sku}
            onChange={(e) => setField('sku', e.target.value)}
            placeholder="Ej. BOT-DAM-001"
            className="uppercase"
            aria-invalid={!!errors.sku}
          />
          {errors.sku && <p className="text-xs text-destructive">{errors.sku}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-category`}>
              Categoría <span className="text-destructive">*</span>
            </Label>
            <Select value={fields.category} onValueChange={(v) => setField('category', v)}>
              <SelectTrigger id={`${formId}-category`} aria-invalid={!!errors.category}>
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-material`}>
              Material <span className="text-destructive">*</span>
            </Label>
            <Select value={fields.material} onValueChange={(v) => setField('material', v as Material)}>
              <SelectTrigger id={`${formId}-material`} aria-invalid={!!errors.material}>
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent>
                {MATERIALS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.material && <p className="text-xs text-destructive">{errors.material}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-brand`}>Marca</Label>
            {brands.length > 0 ? (
              <Select value={fields.brand} onValueChange={(v) => setField('brand', v)}>
                <SelectTrigger id={`${formId}-brand`}>
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin marca</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`${formId}-brand`}
                value={fields.brand}
                onChange={(e) => setField('brand', e.target.value)}
                placeholder="Ej. Vélez"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-color`}>Color</Label>
            <Input
              id={`${formId}-color`}
              value={fields.color}
              onChange={(e) => setField('color', e.target.value)}
              placeholder="Ej. Negro"
            />
          </div>
        </div>
      </section>

      {/* Precios */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Precios (COP)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-price-cost`}>
              Precio costo <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${formId}-price-cost`}
              inputMode="numeric"
              value={fields.price_cost}
              onChange={(e) => setField('price_cost', e.target.value)}
              onBlur={() => handlePriceBlur('price_cost')}
              onFocus={(e) => setField('price_cost', String(parseCOP(e.target.value) || ''))}
              placeholder="$ 0"
              aria-invalid={!!errors.price_cost}
            />
            {errors.price_cost && <p className="text-xs text-destructive">{errors.price_cost}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-price-sale`}>
              Precio venta <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${formId}-price-sale`}
              inputMode="numeric"
              value={fields.price_sale}
              onChange={(e) => setField('price_sale', e.target.value)}
              onBlur={() => handlePriceBlur('price_sale')}
              onFocus={(e) => setField('price_sale', String(parseCOP(e.target.value) || ''))}
              placeholder="$ 0"
              aria-invalid={!!errors.price_sale}
            />
            {errors.price_sale && <p className="text-xs text-destructive">{errors.price_sale}</p>}
          </div>
        </div>
      </section>

      {/* Imagen */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Imagen del producto
        </h2>
        {imagePreview ? (
          <div className="relative w-full aspect-square max-w-[200px] rounded-lg overflow-hidden border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Vista previa" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
              aria-label="Quitar imagen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full max-w-[200px] aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs font-medium">Subir imagen</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleImageChange}
          aria-label="Seleccionar imagen"
        />

        {!imagePreview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            Seleccionar archivo
          </Button>
        )}

        {errors.image && <p className="text-xs text-destructive">{errors.image}</p>}
        <p className="text-xs text-muted-foreground">PNG, JPG o WEBP · máx. 5 MB</p>
      </section>

      {/* Tallas (solo crear) */}
      {!isEditMode && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Tallas y stock inicial
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ingresa 0 para omitir una talla.
            </p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {SHOE_SIZES.map((size) => (
              <div key={size} className="space-y-1">
                <Label
                  htmlFor={`${formId}-size-${size}`}
                  className="text-xs font-medium text-center block"
                >
                  {size}
                </Label>
                <Input
                  id={`${formId}-size-${size}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={sizeStock.get(size) ?? 0}
                  onChange={(e) => handleSizeStockChange(size, e.target.value)}
                  className="text-center px-1 h-9 text-sm"
                />
              </div>
            ))}
          </div>
          {(() => {
            const withStock = SHOE_SIZES.filter((s) => (sizeStock.get(s) ?? 0) > 0);
            const totalUnits = SHOE_SIZES.reduce((acc, s) => acc + (sizeStock.get(s) ?? 0), 0);
            if (withStock.length === 0) return null;
            return (
              <p className="text-xs text-muted-foreground">
                {withStock.length} talla{withStock.length !== 1 ? 's' : ''} · {totalUnits} unidad
                {totalUnits !== 1 ? 'es' : ''} en total
              </p>
            );
          })()}
        </section>
      )}

      {/* Estado */}
      <section className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div>
          <Label htmlFor={`${formId}-is-active`} className="font-medium cursor-pointer">
            Producto activo
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Los productos inactivos no aparecen en el punto de venta.
          </p>
        </div>
        <Switch
          id={`${formId}-is-active`}
          checked={fields.is_active}
          onCheckedChange={(checked) => setField('is_active', checked)}
        />
      </section>

      {/* Footer */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEditMode ? 'Guardando…' : 'Creando…'}
            </>
          ) : isEditMode ? (
            'Guardar cambios'
          ) : (
            'Crear producto'
          )}
        </Button>
      </div>
    </form>
  );
}
