"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminGuard from '@/components/guards/AdminGuard';

const navLinks = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/users', label: 'Users' },
  { href: '/admin-products', label: 'Products' },
  { href: '/orders', label: 'Orders' },
  { href: '/messages', label: 'Messages' },
  { href: '/settings', label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-canvas">
        {/* Sticky (not fixed) so the aside stays in flow and the content column keeps its own width.
            top-20 clears the 5rem sticky site header; self-start stops the flex row from stretching
            the aside to full height, which would leave it nothing to scroll against. */}
        <aside className="sticky top-20 h-[calc(100vh-5rem)] w-64 shrink-0 self-start overflow-y-auto border-r border-line bg-navy p-4">
          <h2 className="mb-6 px-3 text-lg font-extrabold uppercase tracking-tight text-white">Admin Console</h2>

          <nav className="space-y-1 text-sm font-semibold">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-2.5 transition ${
                    active ? 'bg-brand text-white' : 'text-navy-soft hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <Link
              href="/"
              className="mt-8 block rounded-lg px-3 py-2.5 text-navy-soft transition hover:bg-white/10 hover:text-white"
            >
              ← Main Site
            </Link>
          </nav>
        </aside>

        {/* min-w-0 lets wide children (tables, product grids) shrink instead of pushing the row wider. */}
        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </AdminGuard>
  );
}
