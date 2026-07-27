import React from 'react';
import { Footer } from '@/components/layout/Footer';
import { ProductDetail } from '@/features/products/ProductDetail';

// `params` is a Promise in this version of Next.js — it must be awaited before use.
export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d]">
      <main className="mx-auto w-full max-w-screen-xl px-4 py-8 sm:px-8 lg:px-16 lg:pb-20">
        <ProductDetail productId={id} />
      </main>

      <Footer />
    </div>
  );
}
