import React from 'react';
import { ProductManager } from '@/features/products/ProductManager';

export default function DashboardProductsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Product Management</h1>
      <p className="text-gray-600 mb-6">Add, edit or remove cars and spare parts. Everything here drives the public catalog.</p>
      <ProductManager />
    </div>
  );
}
