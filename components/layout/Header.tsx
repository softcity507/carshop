import React from 'react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
      <h1 className="text-xl font-bold">CarShop</h1>
      <nav className="flex space-x-4 text-sm font-medium">
        <Link href="/" className="hover:underline">Home</Link>
        <Link href="/products" className="hover:underline">Products</Link>
        <Link href="/about" className="hover:underline">About</Link>
        <Link href="/contact" className="hover:underline">Contact</Link>
        <Link href="/user" className="hover:underline text-blue-600">User Dashboard</Link>
        <Link href="/admin" className="hover:underline text-purple-600">Admin Dashboard</Link>
      </nav>
    </header>
  );
}

