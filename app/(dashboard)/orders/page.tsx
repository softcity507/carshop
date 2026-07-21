import React from 'react';
import { OrderSummary } from '@/features/orders/OrderSummary';

export default function DashboardOrdersPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Order Management</h1>
      <p className="text-gray-600 mb-6">Lorem ipsum dolor sit amet, view and update active customer orders.</p>
      <OrderSummary />
    </div>
  );
}
