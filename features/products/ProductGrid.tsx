import React from 'react';
import Link from 'next/link';
import { AddToCartButton } from '@/features/cart/AddToCartButton';
import { cloudinaryThumb } from '@/lib/cloudinary';
import { productSpecChips, type Product } from '@/types/product';

export function formatPrice(product: Pick<Product, 'price' | 'currency'>) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: product.currency || 'USD',
      maximumFractionDigits: product.price % 1 === 0 ? 0 : 2,
    }).format(product.price);
  } catch {
    return `${product.currency} ${product.price.toLocaleString()}`;
  }
}

function stockLabel(product: Product) {
  if (product.stock <= 0) return { text: 'Out of stock', tone: 'text-rose-300' };
  if (product.type === 'part' && product.stock <= 5) return { text: `Only ${product.stock} left`, tone: 'text-amber-300' };
  return { text: 'In stock', tone: 'text-slate-300' };
}

interface ProductGridProps {
  products: Product[];
  /** Renders edit/delete controls on each card. */
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  deletingId?: string | null;
  emptyMessage?: string;
}

export function ProductGrid({
  products,
  onEdit,
  onDelete,
  deletingId,
  emptyMessage = 'No products yet.',
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/50 px-6 py-16 text-center text-sm text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const cover = product.imageUrls?.[0];
        const stock = stockLabel(product);

        return (
          <article
            key={product.id}
            className="group flex flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/90 p-6 shadow-2xl transition hover:-translate-y-1 hover:border-red-500/50"
          >
            {cover ? (
              <div
                className="-mx-6 -mt-6 mb-6 h-56 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                style={{ backgroundImage: `url(${cloudinaryThumb(cover, 600)})` }}
              />
            ) : (
              <div className="-mx-6 -mt-6 mb-6 flex h-56 items-center justify-center bg-slate-950/60 text-xs uppercase tracking-[0.2em] text-slate-600">
                No image
              </div>
            )}

            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-red-400">
                  {product.badge || (product.type === 'car' ? 'Vehicle' : 'Spare Part')}
                </p>
                <h3 className="mt-4 text-xl font-bold text-white">{product.name}</h3>
              </div>
              <div className={`shrink-0 rounded-2xl bg-slate-950/70 px-3 py-2 text-xs ${stock.tone}`}>{stock.text}</div>
            </div>

            {product.description && (
              <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-300">{product.description}</p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {productSpecChips(product).map((spec) => (
                <span
                  key={spec}
                  className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-medium capitalize text-slate-300"
                >
                  {spec}
                </span>
              ))}
            </div>

            <div className="mt-auto pt-6">
              {onEdit || onDelete ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-lg font-semibold text-white">{formatPrice(product)}</span>
                <div className="flex gap-2">
                  {!product.published && (
                    <span className="self-center rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase text-amber-300">
                      Draft
                    </span>
                  )}
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/10"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(product)}
                      disabled={deletingId === product.id}
                      className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 ring-1 ring-inset ring-rose-500/30 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === product.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-lg font-semibold text-white">{formatPrice(product)}</span>
                    <Link
                      href={`/products/${product.id}`}
                      className="rounded-2xl bg-white/5 px-4 py-2 text-sm font-semibold uppercase tracking-[0.15em] text-slate-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/10"
                    >
                      Details
                    </Link>
                  </div>
                  <AddToCartButton product={product} tone="dark" />
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
