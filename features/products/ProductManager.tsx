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
      <div className="rounded-3xl border border-white/10 bg-slate-900/90 px-6 py-12 text-center text-sm text-slate-400">
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

      <div className="rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Inventory</h2>
            <p className="mt-2 text-sm text-slate-400">
              {loading
                ? 'Loading products…'
                : `${counts.cars} car${counts.cars === 1 ? '' : 's'} · ${counts.parts} part${counts.parts === 1 ? '' : 's'}${
                    counts.drafts ? ` · ${counts.drafts} draft${counts.drafts === 1 ? '' : 's'}` : ''
                  }`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl bg-slate-950/70 p-1 ring-1 ring-white/10">
              {filters.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                    filter === option.value ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="rounded-2xl border border-white/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              Refresh
            </button>

            {!showForm && (
              <button
                type="button"
                onClick={startCreate}
                className="rounded-2xl bg-red-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-red-500"
              >
                + Add product
              </button>
            )}
          </div>
        </div>

        {/* Action feedback sits above the grid so a failed delete never hides the inventory. */}
        {actionError && (
          <p className="mb-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {actionError}
          </p>
        )}
        {notice && !actionError && (
          <p className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
            <button type="button" onClick={() => setNotice(null)} className="text-xs uppercase tracking-wider opacity-70 hover:opacity-100">
              Dismiss
            </button>
          </p>
        )}

        {loadError ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-6 text-sm text-rose-100">
            <p>{loadError}</p>
            <button type="button" onClick={refresh} className="mt-3 rounded-xl bg-rose-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider">
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((slot) => (
              <div key={slot} className="h-80 animate-pulse rounded-[2rem] border border-white/5 bg-slate-950/50" />
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
