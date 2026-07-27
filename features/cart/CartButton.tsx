"use client";

import Link from 'next/link';
import { FiShoppingCart } from 'react-icons/fi';
import { useCart } from '@/hooks/useCart';

/** Cart icon + live badge. Rendered in the desktop nav and next to the mobile menu toggle. */
export function CartButton({ onNavigate }: { onNavigate?: () => void }) {
  const { itemCount, isCartReady } = useCart();

  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      aria-label={`Cart${isCartReady && itemCount ? `, ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}`}
      className="relative rounded-full p-2.5 text-slate-200 transition hover:bg-slate-800 hover:text-white"
    >
      <FiShoppingCart size={22} />
      {/* Hidden until the stored cart is read, so server and client markup agree on first paint. */}
      {isCartReady && itemCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#bb0014] px-1 text-[10px] font-bold text-white">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
