import React from 'react';
import { ProductManager } from '@/features/products/ProductManager';

export default function DashboardProductsPage() {
  return (
    <div>
      <h1 className="page-title">Product Management</h1>
      <p className="page-subtitle mb-8">Add, edit or remove cars and spare parts. Everything here drives the public catalog.</p>
      <ProductManager />
    </div>
  );
}
