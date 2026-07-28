import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { CheckoutForm } from '@/features/checkout/CheckoutForm';

export const metadata: Metadata = {
  title: 'Checkout | CarShop',
};

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="mx-auto w-full max-w-screen-xl px-4 py-8 sm:px-8 lg:px-16 lg:pb-20">
        <h1 className="page-title mb-8">Checkout</h1>

        {/* `useSearchParams` reads `?cancelled=1`, so it needs a boundary above it. */}
        <Suspense fallback={<div className="card h-96 animate-pulse bg-skeleton" />}>
          <CheckoutForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
