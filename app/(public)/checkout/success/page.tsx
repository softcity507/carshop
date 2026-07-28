import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { CheckoutSuccess } from '@/features/checkout/CheckoutSuccess';

export const metadata: Metadata = {
  title: 'Order Confirmed | CarShop',
};

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="mx-auto w-full max-w-screen-xl px-4 py-16 sm:px-8 lg:px-16 lg:pb-24">
        {/* `useSearchParams` needs a Suspense boundary or the whole route opts out of prerendering. */}
        <Suspense
          fallback={<div className="card mx-auto h-96 max-w-2xl animate-pulse bg-skeleton" />}
        >
          <CheckoutSuccess />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
