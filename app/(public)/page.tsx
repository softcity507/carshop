import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGrid } from '@/features/products/ProductGrid';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
       <main className="flex-1 max-w-6xl mx-auto p-6 w-full">
        <section className="py-12 text-center bg-gray-50 border rounded-xl mb-8 p-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Welcome to CarShop</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Featured Vehicles</h2>
          <ProductGrid />
        </section>
      </main>
      <Footer />
    </div>
  );
}
