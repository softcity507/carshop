import React from 'react';
import { Footer } from '@/components/layout/Footer';
import { ProductCatalog } from '@/features/products/ProductCatalog';

export default function ProductsPage() {
  return (
    <div className="flex flex-1 flex-col bg-[#f8f9fa] text-[#191c1d]">
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-8 sm:px-8 lg:px-16 lg:pb-20">
        <section className="mb-12 max-w-3xl">
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-[#031636] sm:text-5xl">Vehicle Catalog</h1>
          <p className="mt-3 text-base leading-7 text-[#44474e]">
            Precision-engineered performance. Explore our curated selection of elite vehicles and genuine spare parts.
          </p>
        </section>

        <ProductCatalog />
      </main>

      <Footer />
    </div>
  );
}
