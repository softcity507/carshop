import { maxQuantityFor, toCartItem, type CartItem } from '@/types/cart';
import type { Product } from '@/types/product';

const STORAGE_KEY = 'carhub_cart';

export interface CartState {
  items: CartItem[];
  /** False until localStorage has been read, so SSR and the first client render agree. */
  hydrated: boolean;
}

/** Frozen so the server snapshot is referentially stable across renders. */
const SERVER_STATE: CartState = Object.freeze({ items: [], hydrated: false });

let state: CartState = SERVER_STATE;
const listeners = new Set<() => void>();

function readStored(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop anything that doesn't look like a cart line — the format may have changed between visits.
    return parsed.filter(
      (entry): entry is CartItem =>
        entry && typeof entry.productId === 'string' && typeof entry.price === 'number' && entry.quantity > 0
    );
  } catch {
    return [];
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(items: CartItem[], persist = true) {
  state = { items, hydrated: true };
  if (persist && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Quota or private-mode failure — the in-memory cart still works for this session.
    }
  }
  emit();
}

function hydrate() {
  if (state.hydrated || typeof window === 'undefined') return;
  // Don't write back what we just read.
  commit(readStored(), false);
}

function update(mutate: (items: CartItem[]) => CartItem[]) {
  commit(mutate(state.items));
}

export const cartStore = {
  /**
   * React subscribes after mount, which is also the first safe moment to touch localStorage —
   * so hydration happens here rather than in an effect.
   */
  subscribe(listener: () => void) {
    listeners.add(listener);
    hydrate();
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): CartState {
    return state;
  },

  getServerSnapshot(): CartState {
    return SERVER_STATE;
  },

  /** Called by the storage event so a second tab stays in sync. */
  syncFromStorage() {
    commit(readStored(), false);
  },

  addItem(product: Product, quantity = 1) {
    update((items) => {
      const ceiling = maxQuantityFor({ type: product.type, stock: product.stock });
      if (ceiling < 1) return items;

      const existing = items.find((entry) => entry.productId === product.id);
      if (!existing) return [...items, toCartItem(product, Math.min(quantity, ceiling))];

      return items.map((entry) =>
        entry.productId === product.id
          ? { ...entry, quantity: Math.min(entry.quantity + quantity, ceiling) }
          : entry
      );
    });
  },

  removeItem(productId: string) {
    update((items) => items.filter((entry) => entry.productId !== productId));
  },

  setQuantity(productId: string, quantity: number) {
    update((items) =>
      items.flatMap((entry) => {
        if (entry.productId !== productId) return [entry];
        if (quantity < 1) return [];
        return [{ ...entry, quantity: Math.min(Math.max(1, Math.trunc(quantity)), maxQuantityFor(entry)) }];
      })
    );
  },

  clear() {
    update(() => []);
  },
};
