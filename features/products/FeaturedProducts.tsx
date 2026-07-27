"use client";

import { useEffect, useState } from 'react';
import { ProductService } from '@/services/product.service';
import type { Product, ProductType } from '@/types/product';
import { ProductGrid } from './ProductGrid';

interface FeaturedProductsProps {
  type?: ProductType;
  limit?: number;
}

export function FeaturedProducts({ type, limit = 6 }: FeaturedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const loaded = await ProductService.getProducts(type);
        if (!active) return;
        // Prefer items the admin flagged as featured, then fall back to the newest.
        const featured = loaded.filter((product) => product.featured);
        setProducts((featured.length ? featured : loaded).slice(0, limit));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load products.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [type, limit]);

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((slot) => (
          <div key={slot} className="h-80 animate-pulse rounded-[2rem] border border-white/5 bg-slate-900/40" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</p>;
  }

  return <ProductGrid products={products} emptyMessage="No featured products yet." />;
}
