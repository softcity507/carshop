import React from 'react';
import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen p-4">
      <h2 className="text-lg font-bold mb-4">Navigation</h2>
      <ul className="space-y-2 text-sm">
        <li><Link href="/dashboard" className="block p-2 rounded hover:bg-gray-200">Dashboard</Link></li>
        <li><Link href="/users" className="block p-2 rounded hover:bg-gray-200">Users</Link></li>
        <li><Link href="/admin-products" className="block p-2 rounded hover:bg-gray-200">Products</Link></li>
        <li><Link href="/orders" className="block p-2 rounded hover:bg-gray-200">Orders</Link></li>
        <li><Link href="/messages" className="block p-2 rounded hover:bg-gray-200">Messages</Link></li>
        <li><Link href="/settings" className="block p-2 rounded hover:bg-gray-200">Settings</Link></li>
      </ul>
    </aside>
  );
}

