'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/pos/product-card';
import { ProductSearch } from '@/components/pos/product-search';
import { CartPanel } from '@/components/pos/cart-panel';
import { CheckoutDialog } from '@/components/pos/checkout-dialog';
import { SaleSuccess } from '@/components/pos/sale-success';
import { useCartStore } from '@/store/cart-store';
import { createClient } from '@/lib/supabase/client';
import type { Product, ProductVariant } from '@/types/database';

type ProductWithVariants = Product & {
  product_variants: ProductVariant[];
};

type SaleResult = {
  invoiceNumber: string;
  total: number;
  customerPhone?: string;
};

export default function POSPage() {
  const { items, clearCart } = useCartStore();

  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithVariants[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from('products')
      .select(`
        id, name, sku, category, brand, color, sale_price, image_url, is_active,
        product_variants ( id, product_id, size, stock )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (queryError) {
      setError('No se pudieron cargar los productos.');
      setIsLoading(false);
      return;
    }

    const withStock = (data as ProductWithVariants[]).filter((p) =>
      p.product_variants.some((v) => v.stock > 0)
    );

    setProducts(withStock);
    setFilteredProducts(withStock);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
    const supabase = createClient();
    supabase.from('categories').select('name').order('name').then(({ data }) => {
      if (data) setCategories(data.map((c) => c.name));
    });
  }, [loadProducts]);

  useEffect(() => {
    let results = products;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.color?.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      results = results.filter((p) => p.category === selectedCategory);
    }
    setFilteredProducts(results);
  }, [searchQuery, selectedCategory, products]);

  const handleCheckout = useCallback(() => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  }, []);

  const handleSaleComplete = useCallback(
    (invoiceNumber: string, total: number, customerPhone: string) => {
      setIsCheckoutOpen(false);
      setSaleResult({ invoiceNumber, total, customerPhone });
      clearCart();
      loadProducts();
    },
    [clearCart, loadProducts]
  );

  const handleSaleSuccessClose = useCallback(() => setSaleResult(null), []);

  if (saleResult) {
    return (
      <SaleSuccess
        invoiceNumber={saleResult.invoiceNumber}
        total={saleResult.total}
        customerPhone={saleResult.customerPhone}
        onNewSale={handleSaleSuccessClose}
      />
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden bg-gray-50">

      {/* ── Left: product grid ─────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Search + filters */}
        <div className="shrink-0 bg-white border-b border-gray-200 px-3 py-2.5 shadow-sm">
          <ProductSearch
            onSearch={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            selectedCategory={selectedCategory}
            categories={categories}
          />
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {error && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <p className="text-red-500 text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={loadProducts}>
                Reintentar
              </Button>
            </div>
          )}

          {isLoading && !error && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-full rounded-xl" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? `Sin resultados para "${searchQuery}"`
                  : 'No hay productos con stock.'}
              </p>
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                  <X className="size-4 mr-1" />
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          )}

          {!isLoading && !error && filteredProducts.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mb-2.5">
                {filteredProducts.length}{' '}
                {filteredProducts.length === 1 ? 'producto' : 'productos'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 pb-28 md:pb-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Right: desktop cart sidebar ────────────────────── */}
      <aside className="hidden md:flex flex-col w-80 lg:w-96 border-l border-gray-200 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-bold text-base text-amber-900">
            Carrito
            {cartCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center size-5 rounded-full bg-amber-700 text-white text-[10px] font-bold">
                {cartCount}
              </span>
            )}
          </h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <CartPanel onCheckout={handleCheckout} />
        </div>
      </aside>

      {/* ── Mobile: FAB cart button ─────────────────────────── */}
      {cartCount > 0 && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="
            md:hidden fixed bottom-[72px] right-4 z-40
            flex items-center gap-2.5
            bg-amber-800 hover:bg-amber-900 active:bg-amber-950
            text-white font-bold text-sm
            px-4 h-14 rounded-2xl
            shadow-2xl shadow-amber-900/40
            transition-all active:scale-95
          "
        >
          <div className="relative">
            <ShoppingCart className="size-5" />
            <span className="absolute -top-2 -right-2.5 size-5 bg-green-400 text-green-900 text-[10px] font-black rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          </div>
          <span>Ver carrito</span>
        </button>
      )}

      {/* ── Mobile: cart sheet ──────────────────────────────── */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent
          side="bottom"
          className="h-[92dvh] rounded-t-3xl p-0 flex flex-col overflow-hidden"
        >
          <SheetHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold text-amber-900">
                Carrito
                {cartCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center size-5 rounded-full bg-amber-700 text-white text-[10px] font-bold">
                    {cartCount}
                  </span>
                )}
              </SheetTitle>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CartPanel onCheckout={handleCheckout} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Checkout dialog */}
      <CheckoutDialog
        open={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSaleComplete={handleSaleComplete}
      />
    </div>
  );
}
