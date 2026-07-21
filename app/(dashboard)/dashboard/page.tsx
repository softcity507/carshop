import React from 'react';
import { DashboardOverview } from '@/features/dashboard/DashboardOverview';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <p className="text-gray-600 mb-6">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Admin stats overview.</p>
      <DashboardOverview />
    </div>
  );
}
