import { useCartContext } from '@/context/CartProvider';

export function useCart() {
  return useCartContext();
}
