import React from 'react';
import { OrderSummary } from '@/features/orders/OrderSummary';

export default function DashboardOrdersPage() {
  return (
    <div>
      <h1 className="page-title">Order Management</h1>
      <p className="page-subtitle mb-8">View and update active customer orders.</p>
      <OrderSummary />
    </div>
  );
}
