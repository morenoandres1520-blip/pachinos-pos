'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Upload,
  Settings,
  Tag,
  Bookmark,
  ImageIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/hooks/use-permissions';
import type { BusinessConfig, Category, Brand } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

export default function SettingsPage() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const supabase = createClient();

  // Business config state
  const [config, setConfig] = useState<Partial<BusinessConfig>>({
    name: '',
    nit: '',
    address: '',
    phone: '',
    city: '',
    logo_url: null,
    footer_message: '',
    iva_enabled: false,
    iva_rate: 19,
  });
  const [configId, setConfigId] = useState<string | null>(null);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');

  // Brands state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newBrand, setNewBrand] = useState('');

  // UI state
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingBrand, setAddingBrand] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [configRes, catRes, brandRes] = await Promise.all([
        supabase.from('business_config').select('*').limit(1).single(),
        supabase.from('categories').select('*').order('name'),
        supabase.from('brands').select('*').order('name'),
      ]);

      if (configRes.data) {
        setConfig(configRes.data);
        setConfigId(configRes.data.id);
      }
      if (catRes.data) setCategories(catRes.data);
      if (brandRes.data) setBrands(brandRes.data);
    } catch {
      toast.error('Error al cargar configuración');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  // ------ Business Config handlers ------

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const payload = {
        name: config.name || '',
        nit: config.nit || '',
        address: config.address || '',
        phone: config.phone || '',
        city: config.city || '',
        logo_url: config.logo_url || null,
        footer_message: config.footer_message || '',
        iva_enabled: config.iva_enabled ?? false,
        iva_rate: config.iva_rate ?? 19,
      };

      if (configId) {
        const { error } = await supabase
          .from('business_config')
          .update(payload)
          .eq('id', configId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('business_config')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) setConfigId(data.id);
      }
      toast.success('Configuración guardada');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al guardar', { description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe pesar más de 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('images').getPublicUrl(fileName);

      setConfig((prev) => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo subido correctamente');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al subir logo', { description: message });
    } finally {
      setUploading(false);
    }
  };

  // ------ Category handlers ------

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    setAddingCategory(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: trimmed })
        .select()
        .single();
      if (error) throw error;
      if (data) setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategory('');
      toast.success('Categoría agregada');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al agregar categoría', { description: message });
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success('Categoría eliminada');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al eliminar categoría', { description: message });
    } finally {
      setDeletingId(null);
    }
  };

  // ------ Brand handlers ------

  const handleAddBrand = async () => {
    const trimmed = newBrand.trim();
    if (!trimmed) return;

    setAddingBrand(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .insert({ name: trimmed })
        .select()
        .single();
      if (error) throw error;
      if (data) setBrands((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewBrand('');
      toast.success('Marca agregada');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al agregar marca', { description: message });
    } finally {
      setAddingBrand(false);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (error) throw error;
      setBrands((prev) => prev.filter((b) => b.id !== id));
      toast.success('Marca eliminada');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al eliminar marca', { description: message });
    } finally {
      setDeletingId(null);
    }
  };

  // ------ Permission check ------

  if (permLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-amber-700" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center">
        <Settings className="size-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Sin acceso</h2>
        <p className="text-sm text-muted-foreground">
          No tienes permisos para acceder a la configuración.
        </p>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-amber-700" />
          <p className="text-sm text-amber-800">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-xl font-bold text-amber-900">Configuración</h2>
        <p className="text-sm text-muted-foreground">
          Administra la información del negocio, categorías y marcas.
        </p>
      </div>

      {/* ---- Business Configuration ---- */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Settings className="size-5" />
            Datos del Negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="biz-name">Nombre del negocio</Label>
            <Input
              id="biz-name"
              placeholder="PaChinos Calzado"
              value={config.name || ''}
              onChange={(e) => setConfig((p) => ({ ...p, name: e.target.value }))}
              className="h-12"
            />
          </div>

          {/* NIT */}
          <div className="space-y-2">
            <Label htmlFor="biz-nit">NIT</Label>
            <Input
              id="biz-nit"
              placeholder="900.123.456-7"
              value={config.nit || ''}
              onChange={(e) => setConfig((p) => ({ ...p, nit: e.target.value }))}
              className="h-12"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="biz-address">Dirección</Label>
            <Input
              id="biz-address"
              placeholder="Calle 10 #5-20"
              value={config.address || ''}
              onChange={(e) => setConfig((p) => ({ ...p, address: e.target.value }))}
              className="h-12"
            />
          </div>

          {/* Phone & City */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="biz-phone">Teléfono</Label>
              <Input
                id="biz-phone"
                placeholder="300 123 4567"
                value={config.phone || ''}
                onChange={(e) => setConfig((p) => ({ ...p, phone: e.target.value }))}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-city">Ciudad</Label>
              <Input
                id="biz-city"
                placeholder="Bogotá"
                value={config.city || ''}
                onChange={(e) => setConfig((p) => ({ ...p, city: e.target.value }))}
                className="h-12"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {config.logo_url ? (
                <img
                  src={config.logo_url}
                  alt="Logo del negocio"
                  className="h-16 w-16 rounded-lg border border-border object-contain"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border">
                  <ImageIcon className="size-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <label htmlFor="logo-upload">
                  <div className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted">
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {uploading ? 'Subiendo...' : 'Subir logo'}
                  </div>
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="sr-only"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG hasta 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Footer Message */}
          <div className="space-y-2">
            <Label htmlFor="biz-footer">Mensaje de pie de factura</Label>
            <Textarea
              id="biz-footer"
              placeholder="Gracias por su compra..."
              value={config.footer_message || ''}
              onChange={(e) =>
                setConfig((p) => ({ ...p, footer_message: e.target.value }))
              }
              rows={3}
            />
          </div>

          <Separator />

          {/* IVA Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>IVA</Label>
                <p className="text-xs text-muted-foreground">
                  Activar impuesto sobre ventas
                </p>
              </div>
              <Switch
                checked={config.iva_enabled ?? false}
                onCheckedChange={(checked) =>
                  setConfig((p) => ({ ...p, iva_enabled: checked }))
                }
              />
            </div>

            {config.iva_enabled && (
              <div className="space-y-2">
                <Label htmlFor="iva-rate">Porcentaje de IVA (%)</Label>
                <Input
                  id="iva-rate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={config.iva_rate ?? 19}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      iva_rate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-12 w-32"
                />
              </div>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSaveConfig}
            disabled={saving}
            className="h-12 w-full bg-amber-700 text-white hover:bg-amber-800 active:bg-amber-900"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Guardar Configuración
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ---- Categories ---- */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Tag className="size-5" />
            Categorías
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new category */}
          <div className="flex gap-2">
            <Input
              placeholder="Nueva categoría..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              className="h-12 flex-1"
            />
            <Button
              onClick={handleAddCategory}
              disabled={addingCategory || !newCategory.trim()}
              className="h-12 shrink-0 bg-amber-700 text-white hover:bg-amber-800"
            >
              {addingCategory ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Agregar
            </Button>
          </div>

          {/* Category list */}
          {categories.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay categorías registradas
            </p>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                >
                  <span className="text-sm font-medium">{cat.name}</span>
                  <DeleteConfirmButton
                    itemName={cat.name}
                    itemType="categoría"
                    deleting={deletingId === cat.id}
                    onConfirm={() => handleDeleteCategory(cat.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Brands ---- */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Bookmark className="size-5" />
            Marcas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new brand */}
          <div className="flex gap-2">
            <Input
              placeholder="Nueva marca..."
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddBrand();
                }
              }}
              className="h-12 flex-1"
            />
            <Button
              onClick={handleAddBrand}
              disabled={addingBrand || !newBrand.trim()}
              className="h-12 shrink-0 bg-amber-700 text-white hover:bg-amber-800"
            >
              {addingBrand ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Agregar
            </Button>
          </div>

          {/* Brand list */}
          {brands.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay marcas registradas
            </p>
          ) : (
            <div className="space-y-2">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                >
                  <span className="text-sm font-medium">{brand.name}</span>
                  <DeleteConfirmButton
                    itemName={brand.name}
                    itemType="marca"
                    deleting={deletingId === brand.id}
                    onConfirm={() => handleDeleteBrand(brand.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Delete Confirmation Sub-component ----

function DeleteConfirmButton({
  itemName,
  itemType,
  deleting,
  onConfirm,
}: {
  itemName: string;
  itemType: string;
  deleting: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
        disabled={deleting}
      >
        {deleting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {itemType}</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar &ldquo;{itemName}&rdquo;? Esta
            acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
