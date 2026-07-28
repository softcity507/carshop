import React from 'react';
import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { CartView } from '@/features/cart/CartView';

export const metadata: Metadata = {
  title: 'Your Cart | CarShop',
};

export default function CartPage() {
  return (
    <div className="flex flex-1 flex-col bg-[#f8f9fa] text-[#191c1d]">
      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-8 sm:px-8 lg:px-16 lg:pb-20">
        <h1 className="mb-8 text-4xl font-extrabold uppercase tracking-tight text-[#031636]">Your Cart</h1>
        <CartView />
      </main>

      <Footer />
    </div>
  );
}
