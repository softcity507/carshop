"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AddToCartButton } from '@/features/cart/AddToCartButton';
import { cloudinaryThumb } from '@/lib/cloudinary';
import { ProductService } from '@/services/product.service';
import { productSpecChips, type Product, type ProductType } from '@/types/product';
import { formatPrice } from './ProductGrid';

type TypeFilter = 'all' | ProductType;

const PRICE_BANDS = [
  { label: 'Any Price', min: 0, max: Infinity },
  { label: 'Under $30k', min: 0, max: 30_000 },
  { label: '$30k - $60k', min: 30_000, max: 60_000 },
  { label: '$60k - $100k', min: 60_000, max: 100_000 },
  { label: '$100k+', min: 100_000, max: Infinity },
];

export function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [bodyStyle, setBodyStyle] = useState('All Styles');
  const [priceBand, setPriceBand] = useState(PRICE_BANDS[0].label);
  const [year, setYear] = useState('Any Year');

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const loaded = await ProductService.getProducts();
        if (active) setProducts(loaded);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load the catalog.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Filter options come from the live inventory rather than a hardcoded list.
  const bodyStyleOptions = useMemo(() => {
    const styles = new Set<string>();
    products.forEach((product) => {
      if (product.type === 'car') styles.add(product.car.bodyStyle);
    });
    return ['All Styles', ...Array.from(styles).sort()];
  }, [products]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    products.forEach((product) => {
      if (product.type === 'car') years.add(product.car.year);
    });
    return ['Any Year', ...Array.from(years).sort((a, b) => b - a).map(String)];
  }, [products]);

  const filtered = useMemo(() => {
    const band = PRICE_BANDS.find((entry) => entry.label === priceBand) ?? PRICE_BANDS[0];

    return products.filter((product) => {
      if (typeFilter !== 'all' && product.type !== typeFilter) return false;
      if (product.price < band.min || product.price > band.max) return false;

      // Car-only facets shouldn't hide spare parts unless a car facet is actually set.
      if (product.type === 'car') {
        if (bodyStyle !== 'All Styles' && product.car.bodyStyle !== bodyStyle) return false;
        if (year !== 'Any Year' && String(product.car.year) !== year) return false;
      } else if (bodyStyle !== 'All Styles' || year !== 'Any Year') {
        return false;
      }

      return true;
    });
  }, [products, typeFilter, bodyStyle, priceBand, year]);

  return (
    <>
      <section className="mb-12 rounded-xl bg-[#1a2b4c] p-6 shadow-lg">
        <div className="mb-6 flex flex-wrap gap-2">
          {([
            { value: 'all', label: 'Everything' },
            { value: 'car', label: 'Cars' },
            { value: 'part', label: 'Spare Parts' },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTypeFilter(option.value)}
              className={`rounded-lg px-5 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${
                typeFilter === option.value ? 'bg-[#bb0014] text-white' : 'bg-white/10 text-[#b6c6f0] hover:bg-white/20'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:items-end">
          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#b6c6f0]">
            Body Style
            <select
              value={bodyStyle}
              onChange={(e) => setBodyStyle(e.target.value)}
              className="mt-2 w-full rounded-lg border-0 bg-white px-4 py-3 text-sm font-medium capitalize tracking-normal text-[#031636] outline-none ring-2 ring-transparent transition focus:ring-[#e51d24]"
            >
              {bodyStyleOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#b6c6f0]">
            Price Range
            <select
              value={priceBand}
              onChange={(e) => setPriceBand(e.target.value)}
              className="mt-2 w-full rounded-lg border-0 bg-white px-4 py-3 text-sm font-medium normal-case tracking-normal text-[#031636] outline-none ring-2 ring-transparent transition focus:ring-[#e51d24]"
            >
              {PRICE_BANDS.map((option) => <option key={option.label}>{option.label}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#b6c6f0]">
            Model Year
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-2 w-full rounded-lg border-0 bg-white px-4 py-3 text-sm font-medium normal-case tracking-normal text-[#031636] outline-none ring-2 ring-transparent transition focus:ring-[#e51d24]"
            >
              {yearOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setTypeFilter('all');
              setBodyStyle('All Styles');
              setPriceBand(PRICE_BANDS[0].label);
              setYear('Any Year');
            }}
            className="rounded-lg bg-[#bb0014] px-8 py-3 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-lg transition hover:bg-[#e51d24]"
          >
            Reset Filters
          </button>
        </div>
      </section>

      {error && (
        <p className="mb-8 rounded-xl border border-[#bb0014]/30 bg-[#bb0014]/10 px-6 py-4 text-sm text-[#bb0014]">{error}</p>
      )}

      {loading ? (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((slot) => (
            <div key={slot} className="h-[26rem] animate-pulse rounded-xl border border-[#c5c6cf] bg-[#e1e3e4]" />
          ))}
        </section>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#c5c6cf] bg-white px-6 py-20 text-center text-sm text-[#44474e]">
          {products.length === 0
            ? 'No products have been published yet. Check back soon.'
            : 'No products match these filters.'}
        </p>
      ) : (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const cover = product.imageUrls?.[0];

            return (
              <article
                key={product.id}
                className="group overflow-hidden rounded-xl border border-[#c5c6cf] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-64 overflow-hidden bg-[#e1e3e4]">
                  {cover ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url(${cloudinaryThumb(cover, 800)})` }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-[#8b8e97]">
                      No image
                    </div>
                  )}
                  <span className="absolute left-4 top-4 rounded bg-[#bb0014] px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-white shadow-lg">
                    {product.badge || (product.type === 'car' ? 'Vehicle' : 'Spare Part')}
                  </span>
                  {product.stock <= 0 && (
                    <span className="absolute right-4 top-4 rounded bg-[#031636] px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-white shadow-lg">
                      Sold out
                    </span>
                  )}
                </div>

                <div className="    flex flex-col justify-between p-3 gap-5 ">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold uppercase tracking-tight text-[#031636]">{product.name}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-[#44474e]">{product.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-bold tracking-tight text-[#bb0014]">{formatPrice(product)}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#44474e]">Per unit</p>
                      {/* Vehicles and spare parts are both stocked by the unit, so both show a count. */}
                      <p
                        className={`mt-2 text-xs font-semibold ${
                          product.stock > 0 ? 'text-emerald-700' : 'text-[#bb0014]'
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                      </p>
                    </div>
                  </div>

                  <div className=" not-[]: flex flex-wrap gap-2">
                    {productSpecChips(product).map((spec) => (
                      <span
                        key={spec}
                        className="rounded-full border border-[#c5c6cf] bg-[#edeeef] px-3 py-1.5 text-xs font-semibold capitalize text-[#031636]"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  <div className="  flex flex-col gap-3">
                    <Link
                      href={`/products/${product.id}`}
                      className="block w-full rounded border-2 border-[#031636] py-3 text-center text-xs font-bold uppercase tracking-[0.15em] text-[#031636] transition hover:bg-[#031636] hover:text-white"
                    >
                      View Details
                    </Link>
                    <AddToCartButton product={product} />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
