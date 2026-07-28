import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-bold mb-2">404 - Page Not Found</h1>
      <p className="text-gray-600 mb-4">Lorem ipsum dolor sit amet, the page you requested could not be found.</p>
      <Link href="/" className="text-blue-600 underline">Return Home</Link>
    </div>
  );
}
