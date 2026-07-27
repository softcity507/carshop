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
  if (product.stock <= 0) return { text: 'Out of stock', tone: 'text-brand' };
  if (product.type === 'part' && product.stock <= 5) return { text: `Only ${product.stock} left`, tone: 'text-warning' };
  return { text: 'In stock', tone: 'text-success' };
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
      <div className="rounded-xl border border-dashed border-line bg-panel px-6 py-16 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  const isAdminView = Boolean(onEdit || onDelete);

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const cover = product.imageUrls?.[0];
        const stock = stockLabel(product);

        return (
          <article
            key={product.id}
            className="group flex flex-col overflow-hidden rounded-xl border border-line bg-panel transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative h-56 overflow-hidden bg-skeleton">
              {cover ? (
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url(${cloudinaryThumb(cover, 600)})` }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-faint">
                  No image
                </div>
              )}

              <span className="absolute left-4 top-4 rounded bg-brand px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-white shadow-lg">
                {product.badge || (product.type === 'car' ? 'Vehicle' : 'Spare Part')}
              </span>

              {isAdminView && !product.published && (
                <span className="absolute right-4 top-4 rounded bg-warning px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-white shadow-lg">
                  Draft
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-bold uppercase tracking-tight text-heading">{product.name}</h3>
                <span className={`shrink-0 text-xs font-semibold ${stock.tone}`}>{stock.text}</span>
              </div>

              {product.description && (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{product.description}</p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {productSpecChips(product).map((spec) => (
                  <span
                    key={spec}
                    className="rounded-full border border-line bg-chip px-3 py-1.5 text-xs font-semibold capitalize text-heading"
                  >
                    {spec}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-6">
                {isAdminView ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xl font-bold tracking-tight text-brand">{formatPrice(product)}</span>

                    <div className="flex gap-2">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(product)}
                          className="rounded-lg border border-line px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-heading transition hover:bg-chip"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(product)}
                          disabled={deletingId === product.id}
                          className="rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand transition hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === product.id ? 'Deleting…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xl font-bold tracking-tight text-brand">{formatPrice(product)}</span>
                      <Link
                        href={`/products/${product.id}`}
                        className="rounded-lg border border-line px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-heading transition hover:bg-chip"
                      >
                        Details
                      </Link>
                    </div>
                    <AddToCartButton product={product} />
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
