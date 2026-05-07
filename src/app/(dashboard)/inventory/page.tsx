'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InventoryCard } from '@/components/inventory/inventory-card';
import { StockAdjustment } from '@/components/inventory/stock-adjustment';
import { ProductForm } from '@/components/inventory/product-form';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Package, AlertTriangle, X } from 'lucide-react';
import type { Product, ProductVariant } from '@/types/database';

interface ProductWithVariants extends Product {
  product_variants: ProductVariant[];
}

type StatusFilter = 'all' | 'active' | 'inactive';

const LOW_STOCK_THRESHOLD = 3;

function SkeletonCard() {
  return (
    <div className="flex rounded-2xl border border-border bg-card overflow-hidden animate-pulse sm:flex-col">
      <div className="shrink-0 w-24 h-24 sm:w-full sm:h-36 bg-muted" />
      <div className="flex-1 p-3 space-y-2">
        <div className="h-4 w-3/4 rounded-lg bg-muted" />
        <div className="h-3 w-1/2 rounded-lg bg-muted" />
        <div className="h-3 w-1/3 rounded-lg bg-muted" />
        <div className="h-8 w-full rounded-xl bg-muted mt-2" />
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const supabase = createClient();
  const { canManageInventory } = usePermissions();

  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithVariants | null>(null);

  const [stockProduct, setStockProduct] = useState<ProductWithVariants | null>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError('No se pudieron cargar los productos. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    setProducts((data as ProductWithVariants[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProducts();
    supabase.from('categories').select('name').order('name').then(({ data }) => {
      if (data) setCategories(data.map((c) => c.name));
    });
  }, [fetchProducts]);

  const handleToggleActive = useCallback(
    async (product: ProductWithVariants) => {
      const { error: updateError } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (!updateError) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p))
        );
      }
    },
    [supabase]
  );

  const handleCreate = () => {
    setEditingProduct(null);
    setSheetOpen(true);
  };

  const handleEdit = (product: ProductWithVariants) => {
    setEditingProduct(product);
    setSheetOpen(true);
  };

  const handleAdjustStock = (product: ProductWithVariants) => {
    setStockProduct(product);
    setStockDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setSheetOpen(false);
    fetchProducts();
  };

  const handleStockSuccess = () => {
    setStockDialogOpen(false);
    fetchProducts();
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      search.trim() === '' ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      (product.brand ?? '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || product.category === categoryFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const lowStockCount = filteredProducts.filter((p) =>
    p.product_variants.some((v) => v.stock < LOW_STOCK_THRESHOLD)
  ).length;

  const hasActiveFilters = search.trim() !== '' || categoryFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="relative min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Inventario</h1>
            <Badge variant="secondary" className="text-xs">
              {loading ? '…' : filteredProducts.length}
            </Badge>
            {!loading && lowStockCount > 0 && (
              <Badge variant="destructive" className="gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {lowStockCount} stock bajo
              </Badge>
            )}
          </div>
          {canManageInventory && (
            <Button size="sm" className="hidden sm:flex gap-1" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nombre, SKU o marca…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 min-w-[130px] text-xs">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 min-w-[110px] text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={fetchProducts}>
              Reintentar
            </Button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="rounded-full bg-muted p-6">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">
                {hasActiveFilters ? 'Sin resultados' : 'No hay productos aún'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasActiveFilters
                  ? 'Prueba ajustando los filtros.'
                  : 'Crea tu primer producto usando el botón +'}
              </p>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        )}

        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <InventoryCard
                key={product.id}
                product={product}
                variants={product.product_variants}
                lowStockThreshold={LOW_STOCK_THRESHOLD}
                canManage={canManageInventory}
                onEdit={() => handleEdit(product)}
                onToggleActive={() => handleToggleActive(product)}
                onAdjustStock={() => handleAdjustStock(product)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB mobile */}
      {canManageInventory && (
        <button
          onClick={handleCreate}
          className="sm:hidden fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
          aria-label="Crear nuevo producto"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{editingProduct ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
          </SheetHeader>
          <ProductForm
            product={editingProduct}
            variants={editingProduct?.product_variants}
            onSuccess={handleFormSuccess}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar stock — {stockProduct?.name}</DialogTitle>
          </DialogHeader>
          {stockProduct && (
            <StockAdjustment
              product={stockProduct}
              variants={stockProduct.product_variants}
              onSuccess={handleStockSuccess}
              onCancel={() => setStockDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
