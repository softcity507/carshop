"use client";

import React from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/guards/AdminGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-gray-50">
        <aside className="w-64 bg-white border-r border-gray-200 p-4">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Admin Console</h2>
          <nav className="space-y-2 text-sm font-medium">
            <Link href="/dashboard" className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100">Overview</Link>
            <Link href="/users" className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100">Users</Link>
            <Link href="/admin-products" className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100">Products</Link>
            <Link href="/orders" className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100">Orders</Link>
            <Link href="/settings" className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100">Settings</Link>
            <Link href="/" className="block px-3 py-2 mt-8 text-blue-600 hover:underline">← Main Site</Link>
          </nav>
        </aside>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}

