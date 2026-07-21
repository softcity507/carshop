import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGrid } from '@/features/products/ProductGrid';

export default function ProductsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto p-6 w-full">
        <h1 className="text-3xl font-bold mb-4">All Products</h1>
        <p className="text-gray-600 mb-6">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Explore our complete car catalog.
        </p>
        <ProductGrid />
      </main>
      <Footer />
    </div>
  );
}
