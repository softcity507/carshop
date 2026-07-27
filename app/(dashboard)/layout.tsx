"use client";

import React from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/guards/AdminGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen  bg-gray-50">
        {/* Sticky (not fixed) so the aside stays in flow and the content column keeps its own width.
            top-20 clears the 5rem sticky site header; self-start stops the flex row from stretching
            the aside to full height, which would leave it nothing to scroll against. */}
        <aside className="sticky top-20 h-[calc(100vh-5rem)] w-64 shrink-0 self-start overflow-y-auto bg-white border-r border-gray-200 p-4">
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
        {/* min-w-0 lets wide children (tables, product grids) shrink instead of pushing the row wider. */}
        <main className="min-w-0 flex-1 p-8">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}

