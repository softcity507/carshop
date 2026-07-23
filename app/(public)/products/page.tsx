import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGrid } from '@/features/products/ProductGrid';

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
 
      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.35em] text-red-400">CarHub Marketplace</p>
                <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                  Premium Cars, Trusted Dealers,
                  <span className="block text-red-400">Built for Pakistan.</span>
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Discover the latest inventory, compare specs, and book your next ride with a fully responsive shopping experience.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-3">
                {['SUV', 'Sedan', 'Electric', 'Pickup', 'Hybrid', 'Luxury'].map((tag) => (
                  <span key={tag} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-slate-200 transition hover:border-red-500 hover:text-white">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-2xl bg-slate-950/80 px-4 py-4 text-sm text-slate-300 ring-1 ring-white/10 sm:px-5">
                24 new listings added this week
              </div>
              <button className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-red-500">
                Browse Featured
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">All Products</h2>
                <p className="mt-1 text-sm text-slate-400">
                  The latest cars in stock with full details, pricing, and availability.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {['New', 'Popular', 'Best Value'].map((filter) => (
                  <button
                    key={filter}
                    className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 transition hover:border-red-500 hover:text-white"
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <ProductGrid />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
