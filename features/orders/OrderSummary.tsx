"use client";

import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiEdit2, FiInbox, FiRefreshCw, FiRotateCcw, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { SHIPPING_COUNTRIES } from '@/lib/constants';
import { formatMoney } from '@/lib/helpers';
import { OrderService } from '@/services/order.service';
import {
  CUSTOMER_LIMITS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  validateCheckoutCustomer,
  type CheckoutCustomer,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from '@/types/order';

type StatusFilter = 'all' | OrderStatus;

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: status })),
];

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-warning-soft text-warning',
  processing: 'bg-navy text-white',
  completed: 'bg-success-soft text-success',
  cancelled: 'bg-chip text-muted',
};

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  paid: 'bg-success-soft text-success',
  unpaid: 'bg-warning-soft text-warning',
  refunded: 'bg-chip text-muted',
  failed: 'bg-brand text-white',
  expired: 'bg-chip text-muted',
};

const EMPTY_CUSTOMER: CheckoutCustomer = {
  fullName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  country: 'US',
  notes: '',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatRelative(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return value;

  const minutes = Math.round((Date.now() - parsed) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))}d ago`;
  return new Date(parsed).toLocaleDateString();
}

export function OrderSummary() {
  const { user, isAuthReady } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !isAdmin) return;

    let active = true;

    (async () => {
      try {
        const loaded = await OrderService.getOrders();
        if (!active) return;
        setOrders(loaded);
        setLoadError(null);
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Unable to load orders.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthReady, isAdmin]);

  const visible = useMemo(
    () => (filter === 'all' ? orders : orders.filter((order) => order.status === filter)),
    [orders, filter]
  );

  const counts = useMemo(() => {
    const tally = { pending: 0, processing: 0, completed: 0, cancelled: 0 } as Record<OrderStatus, number>;
    orders.forEach((order) => {
      if (ORDER_STATUSES.includes(order.status)) tally[order.status] += 1;
    });
    return tally;
  }, [orders]);

  // The selection is kept by id so it survives a refresh, and falls back to the first visible row.
  const selected = visible.find((order) => order.id === selectedId) ?? visible[0] ?? null;

  async function handleRefresh() {
    setRefreshing(true);
    setActionError(null);
    try {
      // Refresh means "go and look again", so it skips the cache.
      setOrders(await OrderService.getOrders(true));
      setLoadError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to refresh orders.');
    } finally {
      setRefreshing(false);
    }
  }

  /** Every edit goes through here, so the list always shows exactly what the server stored. */
  async function handleSave(order: Order, patch: Parameters<typeof OrderService.updateOrder>[1]) {
    setBusyId(order.id);
    setActionError(null);
    try {
      const saved = await OrderService.updateOrder(order.id, patch);
      setOrders((current) => current.map((entry) => (entry.id === order.id ? saved : entry)));
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update this order.');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  /** Recorded after the money has actually been moved (or refused) in Stripe. */
  async function handleRefundDecision(order: Order, decision: 'approved' | 'declined', note: string) {
    setBusyId(order.id);
    setActionError(null);
    try {
      const saved = await OrderService.resolveRefund(order.id, decision, note);
      setOrders((current) => current.map((entry) => (entry.id === order.id ? saved : entry)));
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to record that decision.');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(order: Order) {
    setBusyId(order.id);
    setActionError(null);
    try {
      await OrderService.deleteOrder(order.id);
      setOrders((current) => current.filter((entry) => entry.id !== order.id));
      // Drop the selection so the list falls back to the next visible row.
      if (selectedId === order.id) setSelectedId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete this order.');
    } finally {
      setBusyId(null);
    }
  }

  if (isAuthReady && !isAdmin) {
    return (
      <div className="card px-6 py-12 text-center text-sm text-muted">
        You need an admin account to manage orders.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((slot) => (
          <div key={slot} className="h-24 animate-pulse rounded-xl bg-skeleton" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return <p className="rounded-xl border border-brand/30 bg-brand/5 px-6 py-6 text-sm text-brand">{loadError}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${
                filter === option.value ? 'bg-brand text-white' : 'border border-line bg-panel text-muted hover:bg-chip'
              }`}
            >
              {option.label}
              <span className="ml-2 opacity-70">
                {option.value === 'all' ? orders.length : counts[option.value]}
              </span>
            </button>
          ))}
        </div>

        <button type="button" onClick={handleRefresh} disabled={refreshing} className="btn-ghost">
          <FiRefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {actionError && (
        <p className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-brand">{actionError}</p>
      )}

      {visible.length === 0 ? (
        <div className="card px-6 py-20 text-center">
          <FiInbox size={40} className="mx-auto text-faint" />
          <p className="mt-6 text-lg font-semibold text-heading">No orders here</p>
          <p className="mt-2 text-sm text-muted">
            {filter === 'all' ? 'Orders placed at checkout will appear in this list.' : 'Nothing with this status.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[24rem_1fr] lg:items-start">
          <div className="card divide-y divide-line overflow-hidden">
            {visible.map((order) => {
              const active = selected?.id === order.id;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className={`block w-full px-5 py-4 text-left transition ${active ? 'bg-chip' : 'hover:bg-chip/60'}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-bold text-heading">{order.customer?.fullName || 'Unknown buyer'}</span>
                    <span className="shrink-0 text-[11px] font-semibold text-faint">
                      {formatRelative(order.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">{order.customer?.email || order.email || '—'}</p>
                  <p className="mt-2 text-sm font-bold text-heading">
                    {formatMoney(order.totalAmount ?? 0, order.currency ?? 'USD')}
                    <span className="ml-2 text-xs font-semibold text-muted">
                      {order.items?.length ?? 0} item{(order.items?.length ?? 0) === 1 ? '' : 's'}
                    </span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Pill className={STATUS_STYLE[order.status] ?? STATUS_STYLE.pending}>{order.status}</Pill>
                    <Pill className={PAYMENT_STYLE[order.paymentStatus] ?? PAYMENT_STYLE.unpaid}>
                      {order.paymentStatus}
                    </Pill>
                    {order.intent === 'enquiry' && <Pill className="bg-chip text-muted">callback</Pill>}
                    {order.refund?.status === 'requested' && (
                      <Pill className="bg-warning-soft text-warning">refund asked</Pill>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <OrderDetail
              key={selected.id}
              order={selected}
              busy={busyId === selected.id}
              onSave={handleSave}
              onDelete={handleDelete}
              onRefundDecision={handleRefundDecision}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${className}`}>
      {children}
    </span>
  );
}

function OrderDetail({
  order,
  busy,
  onSave,
  onDelete,
  onRefundDecision,
}: {
  order: Order;
  busy: boolean;
  onSave: (order: Order, patch: Parameters<typeof OrderService.updateOrder>[1]) => Promise<boolean>;
  onDelete: (order: Order) => void;
  onRefundDecision: (order: Order, decision: 'approved' | 'declined', note: string) => Promise<boolean>;
}) {
  const [refundNote, setRefundNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CheckoutCustomer>({ ...EMPTY_CUSTOMER, ...order.customer });
  const [note, setNote] = useState(order.adminNote ?? '');
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutCustomer, string>>>({});
  /** Deleting is one click, then an explicit confirm — no accidental removals from a stray click. */
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const currency = order.currency ?? 'USD';

  function update(field: keyof CheckoutCustomer, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  function cancelEdit() {
    setDraft({ ...EMPTY_CUSTOMER, ...order.customer });
    setNote(order.adminNote ?? '');
    setErrors({});
    setEditing(false);
  }

  async function saveDetails() {
    const found = validateCheckoutCustomer(draft);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    if (await onSave(order, { customer: draft, adminNote: note })) setEditing(false);
  }

  return (
    <article className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-heading">
            {formatMoney(order.totalAmount ?? 0, currency)}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {order.customer?.fullName || 'Unknown buyer'} ·{' '}
            <a href={`mailto:${order.customer?.email ?? order.email}`} className="font-semibold text-brand hover:underline">
              {order.customer?.email || order.email || '—'}
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill className={STATUS_STYLE[order.status] ?? STATUS_STYLE.pending}>{order.status}</Pill>
          <Pill className={PAYMENT_STYLE[order.paymentStatus] ?? PAYMENT_STYLE.unpaid}>{order.paymentStatus}</Pill>
        </div>
      </div>

      {order.refund?.status === 'requested' && (
        <section className="mt-8 rounded-lg border border-warning/40 bg-warning-soft p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-warning">
            <FiRotateCcw size={15} /> The buyer has asked for a refund
          </p>
          <p className="mt-2 whitespace-pre-line rounded-lg bg-panel/70 p-4 text-sm leading-6 text-ink">
            {order.refund.reason}
          </p>
          <p className="mt-2 text-[11px] text-muted">Requested {formatDateTime(order.refund.requestedAt)}</p>

          <label className="field-label mt-5 block" htmlFor={`refund-note-${order.id}`}>
            Reply to the buyer (optional)
          </label>
          <textarea
            id={`refund-note-${order.id}`}
            rows={2}
            className="field-input mt-2 resize-y"
            maxLength={1000}
            value={refundNote}
            onChange={(event) => setRefundNote(event.target.value)}
          />

          <p className="mt-3 text-xs text-muted">
            Issue the refund in Stripe first — recording it here only updates CarShop.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onRefundDecision(order, 'approved', refundNote).then(() => setRefundNote(''))}
              disabled={busy}
              className="btn-primary"
            >
              <FiRotateCcw size={14} /> {busy ? 'Saving…' : 'Mark as refunded'}
            </button>
            <button
              type="button"
              onClick={() => onRefundDecision(order, 'declined', refundNote).then(() => setRefundNote(''))}
              disabled={busy}
              className="btn-ghost"
            >
              <FiX size={14} /> Decline
            </button>
          </div>
        </section>
      )}

      {order.refund && order.refund.status !== 'requested' && (
        <p className="mt-8 rounded-lg border border-line bg-chip/50 px-4 py-3 text-xs text-muted">
          Refund {order.refund.status} on {formatDateTime(order.refund.resolvedAt)}.
          {order.refund.resolutionNote ? ` “${order.refund.resolutionNote}”` : ''}
        </p>
      )}

      {/* Pipeline moves are one-click — they are the edit an admin makes most often. */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`status-${order.id}`}>
            Order status
          </label>
          <select
            id={`status-${order.id}`}
            className="field-input mt-2"
            value={order.status}
            disabled={busy}
            onChange={(event) => onSave(order, { status: event.target.value as OrderStatus })}
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor={`payment-${order.id}`}>
            Payment status
          </label>
          <select
            id={`payment-${order.id}`}
            className="field-input mt-2"
            value={order.paymentStatus}
            disabled={busy}
            onChange={(event) => onSave(order, { paymentStatus: event.target.value as PaymentStatus })}
          >
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[11px] text-faint sm:col-span-2">
          Marking an order <strong>completed</strong> also marks it <strong>paid</strong>, and marking it
          paid completes it. Set the other one afterwards if you need a different combination.
        </p>
      </section>

      {/* Read-only on purpose: these lines are what Stripe actually charged. */}
      <section className="mt-8">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Items</h3>
        <ul className="mt-3 overflow-hidden rounded-lg border border-line">
          {(order.items ?? []).map((item, index) => (
            <li
              key={item.productId}
              className={`flex flex-wrap items-baseline justify-between gap-4 px-4 py-3 ${
                index % 2 === 0 ? 'bg-panel' : 'bg-chip/50'
              }`}
            >
              <span className="min-w-0 text-sm text-heading">
                <span className="font-semibold">{item.name}</span>
                <span className="text-muted"> × {item.quantity}</span>
              </span>
              <span className="text-sm font-semibold text-heading">
                {formatMoney(item.price * item.quantity, currency)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-faint">
          Items and totals match the payment and cannot be edited here.
        </p>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Delivery details</h3>
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost">
              <FiEdit2 size={13} /> Edit details
            </button>
          )}
        </div>

        {editing ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <EditField label="Full name" value={draft.fullName} error={errors.fullName}
              maxLength={CUSTOMER_LIMITS.fullName} onChange={(value) => update('fullName', value)} />
            <EditField label="Email" type="email" value={draft.email} error={errors.email}
              maxLength={CUSTOMER_LIMITS.email} onChange={(value) => update('email', value)} />
            <EditField label="Phone" type="tel" value={draft.phone} error={errors.phone}
              maxLength={CUSTOMER_LIMITS.phone} onChange={(value) => update('phone', value)} />

            <div>
              <label className="field-label" htmlFor={`country-${order.id}`}>
                Country
              </label>
              <select
                id={`country-${order.id}`}
                className="field-input mt-2"
                value={draft.country}
                onChange={(event) => update('country', event.target.value)}
              >
                {SHIPPING_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.country && <p className="mt-1.5 text-xs text-brand">{errors.country}</p>}
            </div>

            <div className="sm:col-span-2">
              <EditField label="Street address" value={draft.addressLine1} error={errors.addressLine1}
                maxLength={CUSTOMER_LIMITS.addressLine1} onChange={(value) => update('addressLine1', value)} />
            </div>
            <div className="sm:col-span-2">
              <EditField label="Apartment, suite" value={draft.addressLine2 ?? ''}
                maxLength={CUSTOMER_LIMITS.addressLine2} onChange={(value) => update('addressLine2', value)} />
            </div>

            <EditField label="City" value={draft.city} error={errors.city}
              maxLength={CUSTOMER_LIMITS.city} onChange={(value) => update('city', value)} />
            <EditField label="Postal code" value={draft.postalCode} error={errors.postalCode}
              maxLength={CUSTOMER_LIMITS.postalCode} onChange={(value) => update('postalCode', value)} />

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor={`buyer-notes-${order.id}`}>
                Buyer&apos;s note
              </label>
              <textarea
                id={`buyer-notes-${order.id}`}
                rows={3}
                className="field-input mt-2 resize-y"
                maxLength={CUSTOMER_LIMITS.notes}
                value={draft.notes ?? ''}
                onChange={(event) => update('notes', event.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor={`admin-note-${order.id}`}>
                Internal note (not shown to the buyer)
              </label>
              <textarea
                id={`admin-note-${order.id}`}
                rows={3}
                className="field-input mt-2 resize-y"
                maxLength={2000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button type="button" onClick={saveDetails} disabled={busy} className="btn-primary">
                <FiSave size={14} /> {busy ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={cancelEdit} disabled={busy} className="btn-ghost">
                <FiX size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <DetailBlock
              rows={[
                ['Name', order.customer?.fullName || '—'],
                ['Email', order.customer?.email || order.email || '—'],
                ['Phone', order.customer?.phone || '—'],
                [
                  'Address',
                  [order.customer?.addressLine1, order.customer?.addressLine2, order.customer?.city,
                   order.customer?.postalCode, order.customer?.country].filter(Boolean).join(', ') || '—',
                ],
                ['Buyer’s note', order.customer?.notes || '—'],
                ['Internal note', order.adminNote || '—'],
              ]}
            />

            <DetailBlock
              rows={[
                ['Order id', order.id],
                ['Placed', formatDateTime(order.createdAt)],
                ['Last updated', formatDateTime(order.updatedAt)],
                ['Route', order.intent === 'enquiry' ? 'Callback request' : 'Stripe payment'],
                ['Stripe session', order.stripeSessionId || '—'],
                ['Payment intent', order.stripePaymentIntentId || '—'],
                ['Stock drawn down', order.fulfilled ? 'Yes' : 'No'],
              ]}
            />
          </>
        )}
      </section>

      {!editing && (
        <section className="mt-8">
          {confirmingDelete ? (
            <div className="rounded-lg border border-brand/40 bg-brand/5 p-5">
              <p className="flex items-start gap-2 text-sm font-bold text-brand">
                <FiAlertTriangle size={16} className="mt-0.5 shrink-0" />
                Really delete {order.customer?.fullName || 'this buyer'}&apos;s order for{' '}
                {formatMoney(order.totalAmount ?? 0, currency)}?
              </p>
              <p className="mt-2 text-sm text-muted">
                This removes the order record permanently and cannot be undone.
                {order.paymentStatus === 'paid' &&
                  ' This order was paid — refund it in Stripe first, or the charge will be left with no record behind it.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onDelete(order)}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-brand-hover disabled:opacity-40"
                >
                  <FiTrash2 size={14} /> {busy ? 'Deleting…' : 'Yes, delete it'}
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)} disabled={busy} className="btn-ghost">
                  <FiX size={14} /> Keep the order
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand/40 bg-brand/5 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-brand transition hover:bg-brand/10 disabled:opacity-40"
            >
              <FiTrash2 size={14} /> Delete order
            </button>
          )}
        </section>
      )}
    </article>
  );
}

function DetailBlock({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="mt-4 overflow-hidden rounded-lg border border-line">
      {rows.map(([label, value], index) => (
        <div
          key={label}
          className={`flex flex-wrap justify-between gap-4 px-4 py-3 ${index % 2 === 0 ? 'bg-panel' : 'bg-chip/50'}`}
        >
          <dt className="text-xs font-bold uppercase tracking-[0.06em] text-muted">{label}</dt>
          <dd className="min-w-0 break-words text-right text-sm font-semibold text-heading">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EditField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  maxLength?: number;
}) {
  const id = `order-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className={`field-input mt-2 ${error ? 'border-brand' : ''}`}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="mt-1.5 text-xs text-brand">{error}</p>}
    </div>
  );
}
