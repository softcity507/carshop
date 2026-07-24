"use client";

import React from 'react';
import Link from 'next/link';
import { DashboardOverview } from '@/features/dashboard/DashboardOverview';
import AdminGuard from '@/components/guards/AdminGuard';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-gray-50">
        <aside className="w-64 bg-white border-r border-gray-200 p-4">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Admin Control Panel</h2>
          <nav className="space-y-2 text-sm font-medium">
            <Link href="/admin" className="block px-3 py-2 rounded bg-blue-50 text-blue-600 font-semibold">Overview</Link>
            <Link href="/users" className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100">Users</Link>
            <Link href="/admin-products" className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100">Products</Link>
            <Link href="/orders" className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100">Orders</Link>
            <Link href="/settings" className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100">Settings</Link>
            <Link href="/" className="block px-3 py-2 mt-8 text-blue-600 hover:underline">← Main Site</Link>
          </nav>
        </aside>
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

