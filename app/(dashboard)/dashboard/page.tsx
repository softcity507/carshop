import React from 'react';
import { DashboardOverview } from '@/features/dashboard/DashboardOverview';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle mb-8">Sales, orders and inventory at a glance.</p>
      <DashboardOverview />
    </div>
  );
}
