"use client";

import { useState } from 'react';
import { FiCheck, FiShoppingCart } from 'react-icons/fi';
import { useCart } from '@/hooks/useCart';
import { maxQuantityFor } from '@/types/cart';
import type { Product } from '@/types/product';

interface AddToCartButtonProps {
  product: Product;
  quantity?: number;
  /** `light` sits on white catalog cards, `dark` on the slate product grid. */
  tone?: 'light' | 'dark';
  className?: string;
  fullWidth?: boolean;
}

export function AddToCartButton({
  product,
  quantity = 1,
  tone = 'light',
  className = '',
  fullWidth = true,
}: AddToCartButtonProps) {
  const { addItem, getQuantity, isCartReady } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const ceiling = maxQuantityFor(product);
  const inCart = getQuantity(product.id);
  const soldOut = ceiling < 1;
  const maxedOut = !soldOut && inCart >= ceiling;

  function handleClick() {
    addItem(product, quantity);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  }

  const base = `inline-flex items-center justify-center gap-2 rounded-lg py-3 text-xs font-bold uppercase tracking-[0.15em] transition disabled:cursor-not-allowed ${
    fullWidth ? 'w-full' : 'px-6'
  }`;

  const palette =
    tone === 'dark'
      ? 'bg-red-600 text-white hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400'
      : 'bg-[#bb0014] text-white hover:bg-[#e51d24] disabled:bg-[#c5c6cf] disabled:text-[#44474e]';

  return (
    <button
      type="button"
      onClick={handleClick}
      // Disabled until the stored cart loads, otherwise the first click can be based on a stale count.
      disabled={!isCartReady || soldOut || maxedOut}
      className={`${base} ${palette} ${className}`}
    >
      {justAdded ? <FiCheck size={16} /> : <FiShoppingCart size={16} />}
      {soldOut ? 'Sold out' : justAdded ? 'Added' : maxedOut ? 'In cart' : 'Add to cart'}
    </button>
  );
}
