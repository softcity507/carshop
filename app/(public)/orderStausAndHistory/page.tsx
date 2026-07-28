import React from 'react';
import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { OrderStatusHistory } from '@/features/orders/OrderStatusHistory';

export const metadata: Metadata = {
  title: 'My Orders | CarShop',
};

export default function OrderStatusHistoryPage() {
  return (
    <div className="flex flex-1 flex-col bg-canvas text-ink">
      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-8 sm:px-8 lg:px-16 lg:pb-20">
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle mb-8">
          Track what is on its way and look back at everything you have ordered.
        </p>

        <OrderStatusHistory />
      </main>

      <Footer />
    </div>
  );
}
