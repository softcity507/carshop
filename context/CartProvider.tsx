'use client';

import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { cartStore } from '@/store/cart.store';
import type { CartItem } from '@/types/cart';
import type { Product } from '@/types/product';

interface CartContextType {
  items: CartItem[];
  /** Total units across all lines — what the header badge shows. */
  itemCount: number;
  /** Number of distinct products. */
  lineCount: number;
  subtotal: number;
  currency: string;
  /** False until localStorage has been read, so SSR and first client render match. */
  isCartReady: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore is the SSR-safe way to read localStorage: the server renders the
  // empty snapshot, the client swaps in the stored cart after mount, and React handles the tearing.
  const { items, hydrated } = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot
  );

  // Keep the cart in sync when the user has the site open in two tabs.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === 'carhub_cart') cartStore.syncFromStorage();
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo<CartContextType>(() => {
    const itemCount = items.reduce((total, entry) => total + entry.quantity, 0);
    const subtotal = items.reduce((total, entry) => total + entry.price * entry.quantity, 0);

    return {
      items,
      itemCount,
      lineCount: items.length,
      subtotal,
      currency: items[0]?.currency ?? 'USD',
      isCartReady: hydrated,
      addItem: cartStore.addItem,
      removeItem: cartStore.removeItem,
      setQuantity: cartStore.setQuantity,
      clearCart: cartStore.clear,
      getQuantity: (productId: string) =>
        items.find((entry) => entry.productId === productId)?.quantity ?? 0,
    };
  }, [items, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
