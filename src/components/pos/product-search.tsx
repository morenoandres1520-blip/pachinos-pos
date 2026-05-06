'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { label: 'Todos', value: '' },
  { label: 'Dama', value: 'Dama' },
  { label: 'Caballero', value: 'Caballero' },
  { label: 'Niño', value: 'Niño' },
  { label: 'Niña', value: 'Niña' },
  { label: 'Deportivo', value: 'Deportivo' },
];

interface ProductSearchProps {
  onSearch: (query: string) => void;
  onCategoryChange: (category: string) => void;
  selectedCategory: string;
}

export function ProductSearch({
  onSearch,
  onCategoryChange,
  selectedCategory,
}: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(query.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onSearch]);

  return (
    <div className="sticky top-0 z-10 bg-background pb-3 space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-12 pl-10 pr-10 rounded-xl border border-border bg-background text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(cat.value)}
            className="shrink-0 rounded-full px-4"
          >
            {cat.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
