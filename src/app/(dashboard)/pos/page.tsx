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
        id,
        name,
        sku,
        category,
        brand,
        color,
        sale_price,
        image_url,
        is_active,
        product_variants (
          id,
          product_id,
          size,
          stock
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (queryError) {
      setError('No se pudieron cargar los productos. Intente de nuevo.');
      setIsLoading(false);
      return;
    }

    const productsWithStock = (data as ProductWithVariants[]).filter((product) =>
      product.product_variants.some((variant) => variant.stock > 0)
    );

    setProducts(productsWithStock);
    setFilteredProducts(productsWithStock);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    let results = products;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      results = results.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.brand?.toLowerCase().includes(query) ||
          product.color?.toLowerCase().includes(query)
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
    (invoiceNumber: string, total: number) => {
      setIsCheckoutOpen(false);
      setSaleResult({ invoiceNumber, total });
      clearCart();
    },
    [clearCart]
  );

  const handleSaleSuccessClose = useCallback(() => {
    setSaleResult(null);
  }, []);

  const handleRetry = useCallback(() => {
    loadProducts();
  }, [loadProducts]);

  if (saleResult) {
    return (
      <SaleSuccess
        invoiceNumber={saleResult.invoiceNumber}
        total={saleResult.total}
        customerPhone={saleResult.customerPhone}
        onNewSale={handleSaleSuccessClose}
        onViewInvoice={handleSaleSuccessClose}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Punto de Venta</h1>
          <ProductSearch
            onSearch={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            selectedCategory={selectedCategory}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Product grid */}
        <main className="flex-1 overflow-y-auto p-4 md:pr-2">
          {error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-red-600 mb-4 text-sm">{error}</p>
              <Button variant="outline" onClick={handleRetry} size="sm">
                Reintentar
              </Button>
            </div>
          )}

          {isLoading && !error && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="flex flex-col space-y-2">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full rounded" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-gray-500 text-sm">
                {searchQuery
                  ? `No se encontraron productos para "${searchQuery}"`
                  : 'No hay productos disponibles con stock.'}
              </p>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          )}

          {!isLoading && !error && filteredProducts.length > 0 && (
            <>
              <p className="text-xs text-gray-500 mb-3">
                {filteredProducts.length}{' '}
                {filteredProducts.length === 1 ? 'producto' : 'productos'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </main>

        {/* Desktop cart panel */}
        <aside className="hidden md:flex md:flex-col w-80 lg:w-96 border-l border-gray-200 bg-white">
          <CartPanel onCheckout={handleCheckout} ivaEnabled={false} ivaRate={0} />
        </aside>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg px-4 py-3 md:hidden">
        <Button
          className="w-full bg-amber-800 hover:bg-amber-900 text-white font-semibold"
          size="lg"
          onClick={() => setIsCartOpen(true)}
          disabled={cartCount === 0}
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          {cartCount === 0 ? 'Carrito vacío' : `Ver carrito (${cartCount})`}
        </Button>
      </div>

      {/* Mobile cart drawer */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-gray-100">
            <SheetTitle className="text-left">Carrito</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CartPanel onCheckout={handleCheckout} ivaEnabled={false} ivaRate={0} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Checkout dialog */}
      <CheckoutDialog
        open={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        ivaEnabled={false}
        ivaRate={0}
        onSaleComplete={handleSaleComplete}
      />
    </div>
  );
}
