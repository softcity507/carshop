import type { Product, ProductType } from './product';

/**
 * A snapshot of the product at the time it was added. Storing a copy (rather than just an id)
 * keeps the cart renderable offline and lets us show what the buyer actually agreed to,
 * even if an admin edits the listing afterwards. Price is re-validated at checkout.
 */
export interface CartItem {
  productId: string;
  type: ProductType;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string;
  /** Stock at the time of adding — used to clamp the quantity stepper. */
  stock: number;
  quantity: number;
}

export function toCartItem(product: Product, quantity: number): CartItem {
  return {
    productId: product.id,
    type: product.type,
    name: product.name,
    price: product.price,
    currency: product.currency,
    imageUrl: product.imageUrls?.[0],
    stock: product.stock,
    quantity,
  };
}

/** A specific vehicle is one-of-a-kind, so it can never be carted more than once. */
export function maxQuantityFor(item: Pick<CartItem, 'type' | 'stock'>) {
  return item.type === 'car' ? Math.min(1, item.stock) : item.stock;
}
