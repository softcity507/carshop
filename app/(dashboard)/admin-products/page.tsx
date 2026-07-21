import React from 'react';
import { ProductGrid } from '@/features/products/ProductGrid';

export default function DashboardProductsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Product Management</h1>
      <p className="text-gray-600 mb-6">Lorem ipsum dolor sit amet, add, edit or remove vehicle inventory listings.</p>
      <ProductGrid />
    </div>
  );
}
