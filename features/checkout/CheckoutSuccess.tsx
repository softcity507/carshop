'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FiAlertCircle, FiCheckCircle, FiClock, FiLoader } from 'react-icons/fi';
import { useCart } from '@/hooks/useCart';
import { formatMoney } from '@/lib/helpers';
import { CheckoutService, type OrderConfirmation } from '@/services/checkout.service';

export function CheckoutSuccess() {
  const sessionId = useSearchParams().get('session_id');
  const { clearCart } = useCart();

  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The cart must only be emptied once — clearing it inside render or on every state change
  // would wipe a cart the shopper started rebuilding in another tab.
  const cleared = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    let active = true;

    CheckoutService.getConfirmation(sessionId)
      .then((result) => {
        if (!active) return;
        setConfirmation(result);
        if (result.paid && !cleared.current) {
          cleared.current = true;
          clearCart();
        }
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, [sessionId, clearCart]);

  // Landing here without Stripe's `session_id` means the page was opened directly, not redirected to.
  const problem = sessionId ? error : 'This page needs a Stripe session — start again from your cart.';

  if (problem) {
    return (
      <Panel
        icon={<FiAlertCircle size={44} className="mx-auto text-brand" />}
        title="We couldn't load your order"
        body={problem}
      />
    );
  }

  if (!confirmation) {
    return (
      <Panel
        icon={<FiLoader size={44} className="mx-auto animate-spin text-muted" />}
        title="Confirming your payment"
        body="Hang on while we check with Stripe."
      />
    );
  }

  if (!confirmation.paid) {
    return (
      <Panel
        icon={<FiClock size={44} className="mx-auto text-muted" />}
        title="Payment is still processing"
        body="Your bank hasn't settled this payment yet. We'll email you the moment it clears — no need to pay again."
        orderId={confirmation.orderId}
      />
    );
  }

  return (
    <div className="card mx-auto max-w-2xl px-6 py-12 text-center sm:px-10">
      <FiCheckCircle size={52} className="mx-auto text-brand" />
      <h1 className="mt-6 text-2xl font-extrabold uppercase tracking-tight text-heading sm:text-3xl">
        Thank you for your order
      </h1>
      <p className="mt-3 text-sm text-muted">
        {confirmation.email
          ? `A receipt is on its way to ${confirmation.email}.`
          : 'A receipt is on its way to your inbox.'}
      </p>

      <ul className="mt-8 space-y-3 border-t border-line pt-8 text-left">
        {confirmation.items.map((item) => (
          <li key={item.productId} className="flex justify-between gap-4 text-sm">
            <span className="min-w-0 text-heading">
              <span className="font-semibold">{item.name}</span>
              <span className="text-muted"> × {item.quantity}</span>
            </span>
            <span className="shrink-0 font-semibold text-heading">
              {formatMoney(item.price * item.quantity, confirmation.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-between border-t border-line pt-6">
        <span className="text-sm font-bold uppercase tracking-[0.06em] text-heading">Paid</span>
        <span className="text-2xl font-bold tracking-tight text-brand">
          {formatMoney(confirmation.totalAmount, confirmation.currency)}
        </span>
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.1em] text-faint">Order {confirmation.orderId}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/orderStausAndHistory" className="btn-primary">
          Track this order
        </Link>
        <Link href="/products" className="btn-outline">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

function Panel({
  icon,
  title,
  body,
  orderId,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  orderId?: string;
}) {
  return (
    <div className="card mx-auto max-w-2xl px-6 py-16 text-center sm:px-10">
      {icon}
      <h1 className="mt-6 text-2xl font-extrabold uppercase tracking-tight text-heading">{title}</h1>
      <p className="mt-3 text-sm text-muted">{body}</p>
      {orderId ? (
        <p className="mt-6 text-xs uppercase tracking-[0.1em] text-faint">Order {orderId}</p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/cart" className="btn-outline">
          Back to cart
        </Link>
        <Link href="/products" className="btn-primary">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
