"use client";

import Link from 'next/link';
import { FiMinus, FiPlus, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import { useCart } from '@/hooks/useCart';
import { cloudinaryThumb } from '@/lib/cloudinary';
import { maxQuantityFor } from '@/types/cart';

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function CartView() {
  const { items, itemCount, subtotal, currency, isCartReady, setQuantity, removeItem, clearCart } = useCart();

  if (!isCartReady) {
    return (
      <div className="space-y-4">
        {[0, 1].map((slot) => (
          <div key={slot} className="h-36 animate-pulse rounded-xl border border-[#c5c6cf] bg-[#e1e3e4]" />
        ))}
      </div>
    );
  }
 
 const handleStrip=()=>{}
 {
  
  
 }



  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#c5c6cf] bg-white px-6 py-20 text-center">
        <FiShoppingCart size={44} className="mx-auto text-[#8b8e97]" />
        <p className="mt-6 text-lg font-semibold text-[#031636]">Your cart is empty</p>
        <p className="mt-2 text-sm text-[#44474e]">Browse the catalog and add a vehicle or a spare part.</p>
        <Link
          href="/products"
          className="mt-8 inline-block rounded-lg bg-[#bb0014] px-8 py-3 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#e51d24]"
        >
          Browse catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="space-y-4">
        {items.map((item) => {
          const ceiling = maxQuantityFor(item);

          return (
            <article
              key={item.productId}
              className="flex flex-col gap-4 rounded-xl border border-[#c5c6cf] bg-white p-4 sm:flex-row sm:items-center"
            >
              <Link
                href={`/products/${item.productId}`}
                className="h-32 w-full shrink-0 overflow-hidden rounded-lg bg-[#e1e3e4] bg-cover bg-center sm:h-24 sm:w-32"
                style={item.imageUrl ? { backgroundImage: `url(${cloudinaryThumb(item.imageUrl, 300)})` } : undefined}
                aria-label={item.name}
              />

              <div className="min-w-0 flex-1">
                <Link href={`/products/${item.productId}`} className="block">
                  <h2 className="truncate text-lg font-bold uppercase tracking-tight text-[#031636] hover:text-[#bb0014]">
                    {item.name}
                  </h2>
                </Link>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.06em] text-[#44474e]">
                  {item.type === 'car' ? 'Vehicle' : 'Spare Part'} · {money(item.price, item.currency)} each
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {/* Vehicles and parts use the same stepper — both are clamped to their stock. */}
                  <div className="flex items-center rounded-lg border border-[#c5c6cf]">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label={`Decrease quantity of ${item.name}`}
                      className="p-2.5 text-[#031636] transition hover:bg-[#edeeef] disabled:opacity-40"
                    >
                      <FiMinus size={14} />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-[#031636]">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= ceiling}
                      aria-label={`Increase quantity of ${item.name}`}
                      className="p-2.5 text-[#031636] transition hover:bg-[#edeeef] disabled:opacity-40"
                    >
                      <FiPlus size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#bb0014] transition hover:underline"
                  >
                    <FiTrash2 size={14} /> Remove
                  </button>
                </div>
              </div>

              <p className="shrink-0 text-xl font-bold tracking-tight text-[#031636] sm:text-right">
                {money(item.price * item.quantity, item.currency)}
              </p>
            </article>
          );
        })}

        <button
          type="button"
          onClick={clearCart}
          className="text-xs font-bold uppercase tracking-[0.1em] text-[#44474e] transition hover:text-[#bb0014]"
        >
          Clear cart
        </button>
      </div>

      <aside className="rounded-xl border border-[#c5c6cf] bg-white p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold uppercase tracking-tight text-[#031636]">Order Summary</h2>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between text-[#44474e]">
            <dt>Items</dt>
            <dd className="font-semibold text-[#031636]">{itemCount}</dd>
          </div>
          <div className="flex justify-between text-[#44474e]">
            <dt>Subtotal</dt>
            <dd className="font-semibold text-[#031636]">{money(subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between text-[#44474e]">
            <dt>Delivery</dt>
            <dd className="font-semibold text-[#031636]">Calculated at checkout</dd>
          </div>
        </dl>

        <div className="mt-6 flex justify-between border-t border-[#c5c6cf] pt-6">
          <span className="text-sm font-bold uppercase tracking-[0.06em] text-[#031636]">Total</span>
          <span className="text-2xl font-bold tracking-tight text-[#bb0014]">{money(subtotal, currency)}</span>
        </div>

        <button
           onClick={handleStrip}
          className="mt-6 w-full rounded-lg bg-[#bb0014] py-3 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#e51d24]"
        >
          Proceed to checkout
        </button>

        <Link
          href="/products"
          className="mt-3 block w-full rounded-lg border-2 border-[#031636] py-3 text-center text-xs font-bold uppercase tracking-[0.15em] text-[#031636] transition hover:bg-[#031636] hover:text-white"
        >
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
