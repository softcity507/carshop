"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProductService } from '@/services/product.service';
import type { Product, ProductInput, ProductType } from '@/types/product';
import { ProductForm } from './ProductForm';
import { ProductGrid } from './ProductGrid';

type Filter = 'all' | ProductType;

const filters: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'car', label: 'Cars' },
  { value: 'part', label: 'Spare parts' },
];

export function ProductManager() {
  const { user, isAuthReady } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bumping this token re-runs the fetch effect — keeps all setState calls off the effect's sync path.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    // Non-admins never fetch; the render guard below shows them a message instead.
    if (!isAuthReady || !isAdmin) return;

    let active = true;

    (async () => {
      try {
        const loaded = await ProductService.getAllProducts();
        if (!active) return;
        setProducts(loaded);
        setLoadError(null);
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Unable to load products.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthReady, isAdmin, reloadToken]);

  function refresh() {
    setLoading(true);
    setLoadError(null);
    setReloadToken((token) => token + 1);
  }

  const visibleProducts = useMemo(
    () => (filter === 'all' ? products : products.filter((product) => product.type === filter)),
    [products, filter]
  );

  const counts = useMemo(
    () => ({
      cars: products.filter((product) => product.type === 'car').length,
      parts: products.filter((product) => product.type === 'part').length,
      drafts: products.filter((product) => !product.published).length,
    }),
    [products]
  );

  async function handleSubmit(input: ProductInput) {
    // Errors propagate to ProductForm so the filled-in form stays on screen.
    if (editing) {
      const updated = await ProductService.updateProduct(editing.id, input);
      setProducts((prev) => prev.map((product) => (product.id === updated.id ? updated : product)));
      setNotice(`Updated "${updated.name}".`);
    } else {
      const created = await ProductService.createProduct(input);
      setProducts((prev) => [created, ...prev]);
      setNotice(`Added "${created.name}".`);
    }

    setShowForm(false);
    setEditing(null);
    setActionError(null);
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    setDeletingId(product.id);
    setActionError(null);
    try {
      await ProductService.deleteProduct(product.id);
      setProducts((prev) => prev.filter((entry) => entry.id !== product.id));
      setNotice(`Deleted "${product.name}".`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete this product.');
    } finally {
      setDeletingId(null);
    }
  }

  function startCreate() {
    setEditing(null);
    setShowForm(true);
    setActionError(null);
  }

  function startEdit(product: Product) {
    setEditing(product);
    setShowForm(true);
    setActionError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (isAuthReady && !isAdmin) {
    return (
      <div className="card px-6 py-12 text-center text-sm text-muted">
        You need an admin account to manage products.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showForm && (
        <ProductForm
          // Remount on target change so the form re-seeds from the product being edited.
          key={editing?.id ?? 'new'}
          initialProduct={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <div className="card p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-heading">Inventory</h2>
            <p className="mt-1 text-sm text-muted">
              {loading
                ? 'Loading products…'
                : `${counts.cars} car${counts.cars === 1 ? '' : 's'} · ${counts.parts} part${counts.parts === 1 ? '' : 's'}${
                    counts.drafts ? ` · ${counts.drafts} draft${counts.drafts === 1 ? '' : 's'}` : ''
                  }`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-line bg-chip p-1">
              {filters.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${
                    filter === option.value ? 'bg-brand text-white' : 'text-muted hover:text-heading'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button type="button" onClick={refresh} disabled={loading} className="btn-ghost">
              Refresh
            </button>

            {!showForm && (
              <button type="button" onClick={startCreate} className="btn-primary px-5 py-2.5">
                + Add product
              </button>
            )}
          </div>
        </div>

        {/* Action feedback sits above the grid so a failed delete never hides the inventory. */}
        {actionError && (
          <p className="mb-4 rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-brand">{actionError}</p>
        )}
        {notice && !actionError && (
          <p className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
            {notice}
            <button type="button" onClick={() => setNotice(null)} className="text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100">
              Dismiss
            </button>
          </p>
        )}

        {loadError ? (
          <div className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-6 text-sm text-brand">
            <p>{loadError}</p>
            <button type="button" onClick={refresh} className="mt-3 rounded-lg border border-brand/40 px-4 py-2 text-xs font-bold uppercase tracking-wider">
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((slot) => (
              <div key={slot} className="h-80 animate-pulse rounded-xl border border-line bg-skeleton" />
            ))}
          </div>
        ) : (
          <ProductGrid
            products={visibleProducts}
            onEdit={startEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
            emptyMessage={
              filter === 'all'
                ? 'No products yet. Use “Add product” to list your first car or spare part.'
                : `No ${filter === 'car' ? 'cars' : 'spare parts'} yet.`
            }
          />
        )}
      </div>
    </div>
  );
}
