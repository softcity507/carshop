import React from 'react';

export function Footer() {
  return (
    <footer className="p-4 border-t border-gray-200 text-center text-sm text-gray-500 bg-white">
      © {new Date().getFullYear()} CarShop. All rights reserved.
    </footer>
  );
}
