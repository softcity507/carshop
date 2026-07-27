"use client";

 
import { DashboardOverview } from '@/features/dashboard/DashboardOverview';
import AdminGuard from '@/components/guards/AdminGuard';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-gray-50">
          
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
          <p className="text-gray-600 mb-6">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Welcome to administrative controls.
          </p>
          <DashboardOverview />
        </main>
      </div>
    </AdminGuard>
  );
}

