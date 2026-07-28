"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiAlertTriangle,
  FiCheck,
  FiClock,
  FiPackage,
  FiPhoneCall,
  FiRefreshCw,
  FiRotateCcw,
  FiShoppingBag,
  FiTruck,
  FiXCircle,
} from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { cloudinaryThumb } from '@/lib/cloudinary';
import { formatMoney } from '@/lib/helpers';
import { OrderService } from '@/services/order.service';
import {
  REFUND_REASON_LIMIT,
  canBuyerDelete,
  canBuyerRequestRefund,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from '@/types/order';

/** The happy path a paid order walks. `cancelled` sits outside it and is shown on its own. */
const TRACK: Array<{ status: OrderStatus; label: string; icon: React.ReactNode }> = [
  { status: 'pending', label: 'Placed', icon: <FiShoppingBag size={13} /> },
  { status: 'processing', label: 'Preparing', icon: <FiPackage size={13} /> },
  { status: 'completed', label: 'Delivered', icon: <FiTruck size={13} /> },
];

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paid: 'Paid',
  unpaid: 'Awaiting payment',
  refunded: 'Refunded',
  failed: 'Payment failed',
  expired: 'Payment expired',
};

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  paid: 'bg-success-soft text-success',
  unpaid: 'bg-warning-soft text-warning',
  refunded: 'bg-chip text-muted',
  failed: 'bg-brand/10 text-brand',
  expired: 'bg-chip text-muted',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function OrderStatusHistory() {
  const { user, isAuthReady } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    let active = true;

    OrderService.getMyOrders()
      .then((mine) => {
        if (!active) return;
        setOrders(mine);
        setError(null);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [isAuthReady, user]);

  // Derived rather than stored: a signed-out visitor has nothing to fetch, so they are never
  // "loading" — they go straight to the sign-in panel below.
  const loading = !isAuthReady || (Boolean(user) && !loaded);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      // Refresh means "go and look again", so it skips the cache.
      setOrders(await OrderService.getMyOrders(true));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh your orders.');
    } finally {
      setRefreshing(false);
    }
  }

  /** Cancelling an unpaid order removes it outright — there is nothing left to keep a record of. */
  async function handleCancel(order: Order) {
    setError(null);
    try {
      await OrderService.deleteOrder(order.id);
      setOrders((current) => current.filter((entry) => entry.id !== order.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel this order.');
    }
  }

  async function handleRefund(order: Order, reason: string) {
    setError(null);
    try {
      const updated = await OrderService.requestRefund(order.id, reason);
      setOrders((current) => current.map((entry) => (entry.id === order.id ? updated : entry)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your refund request.');
    }
  }

  if (!isAuthReady || loading) {
    return (
      <div className="space-y-4">
        {[0, 1].map((slot) => (
          <div key={slot} className="h-56 animate-pulse rounded-xl bg-skeleton" />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card px-6 py-20 text-center">
        <FiClock size={40} className="mx-auto text-faint" />
        <p className="mt-6 text-lg font-semibold text-heading">Sign in to see your orders</p>
        <p className="mt-2 text-sm text-muted">
          Your order history is kept against your account, so we need to know who you are.
        </p>
        <Link href="/login" className="btn-primary mt-8">
          Sign in
        </Link>
      </div>
    );
  }

  if (error) {
    return <p className="rounded-xl border border-brand/30 bg-brand/5 px-6 py-6 text-sm text-brand">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="card px-6 py-20 text-center">
        <FiShoppingBag size={40} className="mx-auto text-faint" />
        <p className="mt-6 text-lg font-semibold text-heading">No orders yet</p>
        <p className="mt-2 text-sm text-muted">Anything you order will show up here with its live status.</p>
        <Link href="/products" className="btn-primary mt-8">
          Browse catalog
        </Link>
      </div>
    );
  }

  // An order is "current" while there is still something for us to do about it.
  const current = orders.filter((order) => order.status === 'pending' || order.status === 'processing');
  const past = orders.filter((order) => order.status === 'completed' || order.status === 'cancelled');

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'} on this account
        </p>
        <button type="button" onClick={handleRefresh} disabled={refreshing} className="btn-ghost">
          <FiRefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <Group
        title="Current orders"
        subtitle="Still in progress — the tracker shows where each one has got to."
        orders={current}
        emptyText="Nothing in progress right now."
        onCancel={handleCancel}
        onRefund={handleRefund}
      />

      <Group
        title="Order history"
        subtitle="Everything you have ordered in the past."
        orders={past}
        emptyText="No completed or cancelled orders yet."
        onCancel={handleCancel}
        onRefund={handleRefund}
      />
    </div>
  );
}

function Group({
  title,
  subtitle,
  orders,
  emptyText,
  onCancel,
  onRefund,
}: {
  title: string;
  subtitle: string;
  orders: Order[];
  emptyText: string;
  onCancel: (order: Order) => Promise<void>;
  onRefund: (order: Order, reason: string) => Promise<void>;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold uppercase tracking-tight text-heading">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>

      {orders.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
          {emptyText}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onCancel={onCancel} onRefund={onRefund} />
          ))}
        </div>
      )}
    </section>
  );
}

function OrderCard({
  order,
  onCancel,
  onRefund,
}: {
  order: Order;
  onCancel: (order: Order) => Promise<void>;
  onRefund: (order: Order, reason: string) => Promise<void>;
}) {
  const currency = order.currency ?? 'USD';
  const items = order.items ?? [];
  const cancelled = order.status === 'cancelled';

  const [panel, setPanel] = useState<'cancel' | 'refund' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const deletable = canBuyerDelete(order);
  const refundable = canBuyerRequestRefund(order);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
      setPanel(null);
      setReason('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
            Ordered {formatDate(order.createdAt)}
          </p>
          <p className="mt-1 truncate text-xs text-faint">Order {order.id}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {order.intent === 'enquiry' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              <FiPhoneCall size={10} /> Callback
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
              PAYMENT_STYLE[order.paymentStatus] ?? PAYMENT_STYLE.unpaid
            }`}
          >
            {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
          </span>
        </div>
      </header>

      <div className="p-5 sm:p-6">
        {cancelled ? (
          <p className="flex items-center gap-2 rounded-lg bg-chip px-4 py-3 text-sm font-semibold text-muted">
            <FiXCircle size={15} /> This order was cancelled.
          </p>
        ) : (
          <StatusTrack status={order.status} />
        )}

        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center gap-4">
              <Link
                href={`/products/${item.productId}`}
                className="h-14 w-16 shrink-0 rounded-lg bg-skeleton bg-cover bg-center"
                style={
                  item.imageUrl ? { backgroundImage: `url(${cloudinaryThumb(item.imageUrl, 200)})` } : undefined
                }
                aria-label={item.name}
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${item.productId}`}
                  className="block truncate text-sm font-bold text-heading hover:text-brand"
                >
                  {item.name}
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  {formatMoney(item.price, currency)} × {item.quantity}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-heading">
                {formatMoney(item.price * item.quantity, currency)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-5">
          <div className="min-w-0 text-xs text-muted">
            <p className="font-bold uppercase tracking-[0.06em]">Delivering to</p>
            <p className="mt-1 break-words">
              {[
                order.customer?.fullName,
                order.customer?.addressLine1,
                order.customer?.city,
                order.customer?.postalCode,
                order.customer?.country,
              ]
                .filter(Boolean)
                .join(', ') || '—'}
            </p>
          </div>

          <p className="text-2xl font-bold tracking-tight text-brand">
            {formatMoney(order.totalAmount ?? 0, currency)}
          </p>
        </div>

        {order.refund && <RefundNotice refund={order.refund} />}

        {(deletable || refundable) && (
          <div className="mt-5 border-t border-line pt-5">
            {panel === null && (
              <div className="flex flex-wrap gap-3">
                {deletable && (
                  <button
                    type="button"
                    onClick={() => setPanel('cancel')}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand/40 bg-brand/5 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-brand transition hover:bg-brand/10"
                  >
                    <FiXCircle size={14} /> Cancel order
                  </button>
                )}

                {refundable && (
                  <button
                    type="button"
                    onClick={() => setPanel('refund')}
                    className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-muted transition hover:bg-chip"
                  >
                    <FiRotateCcw size={14} /> Request a refund
                  </button>
                )}
              </div>
            )}

            {panel === 'cancel' && (
              <div className="rounded-lg border border-brand/40 bg-brand/5 p-5">
                <p className="flex items-start gap-2 text-sm font-bold text-brand">
                  <FiAlertTriangle size={15} className="mt-0.5 shrink-0" />
                  Cancel this order for {formatMoney(order.totalAmount ?? 0, currency)}?
                </p>
                <p className="mt-2 text-sm text-muted">
                  Nothing has been charged, so the order will be removed completely. This cannot be undone —
                  you would need to place it again.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => run(() => onCancel(order))}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-brand-hover disabled:opacity-40"
                  >
                    <FiXCircle size={14} /> {busy ? 'Cancelling…' : 'Yes, cancel it'}
                  </button>
                  <button type="button" onClick={() => setPanel(null)} disabled={busy} className="btn-ghost">
                    Keep my order
                  </button>
                </div>
              </div>
            )}

            {panel === 'refund' && (
              <div className="rounded-lg border border-line bg-chip/40 p-5">
                <label className="field-label" htmlFor={`refund-${order.id}`}>
                  Why would you like a refund?
                </label>
                <textarea
                  id={`refund-${order.id}`}
                  rows={4}
                  className="field-input mt-2 resize-y"
                  maxLength={REFUND_REASON_LIMIT}
                  value={reason}
                  placeholder="Tell us what went wrong so we can sort it out quickly."
                  onChange={(event) => setReason(event.target.value)}
                />
                <p className="mt-2 text-xs text-faint">
                  We&apos;ll review this and refund to your original payment method. Nothing is refunded
                  automatically.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => run(() => onRefund(order, reason.trim()))}
                    disabled={busy || reason.trim().length === 0}
                    className="btn-primary"
                  >
                    <FiRotateCcw size={14} /> {busy ? 'Sending…' : 'Send request'}
                  </button>
                  <button type="button" onClick={() => setPanel(null)} disabled={busy} className="btn-ghost">
                    Never mind
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/** Shows where a refund request has got to, once one exists. */
function RefundNotice({ refund }: { refund: NonNullable<Order['refund']> }) {
  const tone =
    refund.status === 'approved'
      ? 'border-success/40 bg-success-soft text-success'
      : refund.status === 'declined'
        ? 'border-line bg-chip text-muted'
        : 'border-warning/40 bg-warning-soft text-warning';

  const headline =
    refund.status === 'approved'
      ? 'Refund approved'
      : refund.status === 'declined'
        ? 'Refund request declined'
        : 'Refund requested — we are looking into it';

  return (
    <div className={`mt-5 rounded-lg border p-4 ${tone}`}>
      <p className="flex items-center gap-2 text-sm font-bold">
        <FiRotateCcw size={14} /> {headline}
      </p>
      {refund.reason && <p className="mt-2 whitespace-pre-line text-xs leading-6">You said: {refund.reason}</p>}
      {refund.resolutionNote && (
        <p className="mt-2 whitespace-pre-line text-xs leading-6">Our reply: {refund.resolutionNote}</p>
      )}
      <p className="mt-2 text-[11px] opacity-80">Requested {formatDate(refund.requestedAt)}</p>
    </div>
  );
}

/** A three-step tracker. Steps up to the current one are filled; the rest stay outlined. */
function StatusTrack({ status }: { status: OrderStatus }) {
  const reached = TRACK.findIndex((step) => step.status === status);

  return (
    <ol className="flex items-center">
      {TRACK.map((step, index) => {
        const done = index <= reached;
        const isLast = index === TRACK.length - 1;

        return (
          <li key={step.status} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                  done ? 'border-brand bg-brand text-white' : 'border-line bg-panel text-faint'
                }`}
              >
                {/* A tick for what's done, the step's own icon for what's still ahead. */}
                {index < reached ? <FiCheck size={14} /> : step.icon}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.06em] ${
                  done ? 'text-heading' : 'text-faint'
                }`}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <span
                aria-hidden
                className={`mx-2 mb-5 h-0.5 flex-1 rounded-full ${index < reached ? 'bg-brand' : 'bg-line'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
