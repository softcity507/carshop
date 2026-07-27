"use client";

import { useState } from 'react';
import { FiCheck, FiShoppingCart } from 'react-icons/fi';
import { useCart } from '@/hooks/useCart';
import { maxQuantityFor } from '@/types/cart';
import type { Product } from '@/types/product';

interface AddToCartButtonProps {
  product: Product;
  quantity?: number;
  className?: string;
  fullWidth?: boolean;
}

export function AddToCartButton({ product, quantity = 1, className = '', fullWidth = true }: AddToCartButtonProps) {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      // Disabled until the stored cart loads, otherwise the first click can be based on a stale count.
      disabled={!isCartReady || soldOut || maxedOut}
      className={`btn-primary ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {justAdded ? <FiCheck size={16} /> : <FiShoppingCart size={16} />}
      {soldOut ? 'Sold out' : justAdded ? 'Added' : maxedOut ? 'In cart' : 'Add to cart'}
    </button>
  );
}
