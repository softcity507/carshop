"use client";

import AdminGuard from '@/components/guards/AdminGuard';
import { DashboardOverview } from '@/features/dashboard/DashboardOverview';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div className="flex flex-1 flex-col bg-canvas">
        <main className="mx-auto w-full max-w-screen-xl flex-1 p-6 lg:p-8">
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle mb-8">Sales, orders and inventory at a glance.</p>
          <DashboardOverview />
        </main>
      </div>
    </AdminGuard>
  );
}
