"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheckCircle,
  FiMail,
  FiPackage,
  FiSettings,
  FiShoppingCart,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { formatMoney } from '@/lib/helpers';
import { ContactService } from '@/services/contact.service';
import { OrderService } from '@/services/order.service';
import { ProductService } from '@/services/product.service';
import { SettingsService } from '@/services/settings.service';
import { UserService } from '@/services/user.service';
import type { Order } from '@/types/order';
import type { Product } from '@/types/product';
import { DEFAULT_SETTINGS, type StoreSettings } from '@/types/settings';

interface CarUser {
  uid: string;
  role?: string | null;
}

interface Snapshot {
  products: Product[];
  orders: Order[];
  users: CarUser[];
  unreadMessages: number;
  settings: StoreSettings;
}

const EMPTY: Snapshot = {
  products: [],
  orders: [],
  users: [],
  unreadMessages: 0,
  settings: DEFAULT_SETTINGS,
};

/** 1,284 · 12.9K · 4.2M — a long count shouldn't wrap its tile. */
function compact(value: number) {
  if (value < 10_000) return value.toLocaleString();
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function DashboardOverview() {
  const { user, isAuthReady } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady || !isAdmin) return;

    let active = true;

    (async () => {
      // `allSettled`, so one failing endpoint leaves the rest of the dashboard populated
      // rather than blanking the whole screen.
      const [products, orders, users, messages, settings] = await Promise.allSettled([
        ProductService.getAllProducts(),
        OrderService.getOrders(),
        UserService.getUsers<CarUser>(),
        ContactService.getMessages(),
        SettingsService.getSettings(),
      ]);

      if (!active) return;

      setData({
        products: products.status === 'fulfilled' ? products.value : [],
        orders: orders.status === 'fulfilled' ? orders.value : [],
        users: users.status === 'fulfilled' ? users.value : [],
        unreadMessages:
          messages.status === 'fulfilled'
            ? messages.value.filter((message) => message.status === 'new').length
            : 0,
        settings: settings.status === 'fulfilled' ? settings.value : DEFAULT_SETTINGS,
      });
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [isAuthReady, isAdmin]);

  if (isAuthReady && !isAdmin) {
    return (
      <div className="card px-6 py-12 text-center text-sm text-muted">
        You need an admin account to see the console.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-xl bg-skeleton" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((slot) => (
            <div key={slot} className="h-28 animate-pulse rounded-xl bg-skeleton" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((slot) => (
            <div key={slot} className="h-44 animate-pulse rounded-xl bg-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const { products, orders, users, unreadMessages, settings } = data;

  const paidOrders = orders.filter((order) => order.paymentStatus === 'paid');
  const revenue = paidOrders.reduce((total, order) => total + (order.totalAmount ?? 0), 0);
  const currency = paidOrders[0]?.currency ?? settings.defaultCurrency ?? 'USD';

  const awaitingPayment = orders.filter((order) => order.paymentStatus === 'unpaid').length;
  const openOrders = orders.filter((order) => order.status === 'pending' || order.status === 'processing').length;
  const callbackOrders = orders.filter((order) => order.intent === 'enquiry').length;
  const refundRequests = orders.filter((order) => order.refund?.status === 'requested').length;

  const drafts = products.filter((product) => product.published === false).length;
  const lowStock = products.filter(
    (product) => (product.stock ?? 0) > 0 && (product.stock ?? 0) <= settings.lowStockThreshold
  ).length;
  const soldOut = products.filter((product) => (product.stock ?? 0) === 0).length;
  const cars = products.filter((product) => product.type === 'car').length;

  const admins = users.filter((entry) => entry.role === 'admin').length;

  // Only genuinely actionable things — an empty strip means there is nothing to chase.
  const alerts = [
    refundRequests > 0 && {
      href: '/orders',
      tone: 'critical' as const,
      label: `${refundRequests} refund ${refundRequests === 1 ? 'request' : 'requests'} to handle`,
    },
    unreadMessages > 0 && {
      href: '/messages',
      tone: 'warning' as const,
      label: `${unreadMessages} unread ${unreadMessages === 1 ? 'message' : 'messages'}`,
    },
    awaitingPayment > 0 && {
      href: '/orders',
      tone: 'warning' as const,
      label: `${awaitingPayment} ${awaitingPayment === 1 ? 'order' : 'orders'} awaiting payment`,
    },
    soldOut > 0 && {
      href: '/admin-products',
      tone: 'critical' as const,
      label: `${soldOut} ${soldOut === 1 ? 'product' : 'products'} sold out`,
    },
    lowStock > 0 && {
      href: '/admin-products',
      tone: 'warning' as const,
      label: `${lowStock} low on stock (${settings.lowStockThreshold} or fewer)`,
    },
  ].filter(Boolean) as Array<{ href: string; tone: 'warning' | 'critical'; label: string }>;

  return (
    <div className="space-y-6">
      {/* The one hero figure this view leads with. */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
          <div className="min-w-0">
            <p className="field-label">Revenue collected</p>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-heading sm:text-5xl">
              {formatMoney(revenue, currency)}
            </p>
            <p className="mt-2 text-sm text-muted">
              Across {paidOrders.length.toLocaleString()} paid {paidOrders.length === 1 ? 'order' : 'orders'}
              {awaitingPayment > 0 && ` · ${awaitingPayment} still awaiting payment`}
            </p>
          </div>

          <Link href="/orders" className="btn-primary">
            Manage orders <FiArrowRight size={14} />
          </Link>
        </div>

        {alerts.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-line bg-chip/40 px-6 py-4 sm:px-8">
            {alerts.map((alert) => (
              <Link
                key={alert.label}
                href={alert.href}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition hover:opacity-80 ${
                  alert.tone === 'critical' ? 'bg-brand/10 text-brand' : 'bg-warning-soft text-warning'
                }`}
              >
                {/* Icon and words carry the state, so it never rides on colour alone. */}
                <FiAlertTriangle size={12} />
                {alert.label}
              </Link>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-2 border-t border-line bg-success-soft px-6 py-4 text-xs font-bold text-success sm:px-8">
            <FiCheckCircle size={13} /> Nothing needs your attention right now
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Orders" value={compact(orders.length)} detail={`${openOrders} still open`} />
        <Stat
          label="Products"
          value={compact(products.length)}
          detail={`${cars} vehicles · ${products.length - cars} parts`}
        />
        <Stat
          label="Customers"
          value={compact(users.length)}
          detail={`${admins} ${admins === 1 ? 'admin' : 'admins'}`}
        />
        <Stat
          label="Unread messages"
          value={compact(unreadMessages)}
          detail={unreadMessages === 0 ? 'Inbox is clear' : 'Waiting for a reply'}
        />
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Admin pages</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <PageCard
            href="/users"
            icon={<FiUsers size={18} />}
            title="Users"
            blurb="Accounts, roles and access."
            facts={[
              [users.length.toLocaleString(), 'registered'],
              [String(admins), admins === 1 ? 'admin' : 'admins'],
            ]}
          />

          <PageCard
            href="/admin-products"
            icon={<FiPackage size={18} />}
            title="Products"
            blurb="Vehicles and spare parts, stock and pricing."
            facts={[
              [products.length.toLocaleString(), 'listed'],
              [String(drafts), drafts === 1 ? 'draft' : 'drafts'],
            ]}
            warning={soldOut > 0 ? `${soldOut} sold out` : lowStock > 0 ? `${lowStock} low on stock` : undefined}
          />

          <PageCard
            href="/orders"
            icon={<FiShoppingCart size={18} />}
            title="Orders"
            blurb="Payments, delivery details and fulfilment."
            facts={[
              [orders.length.toLocaleString(), 'total'],
              [String(callbackOrders), 'callback requests'],
            ]}
            warning={
              refundRequests > 0
                ? `${refundRequests} refund ${refundRequests === 1 ? 'request' : 'requests'}`
                : awaitingPayment > 0
                  ? `${awaitingPayment} awaiting payment`
                  : undefined
            }
          />

          <PageCard
            href="/messages"
            icon={<FiMail size={18} />}
            title="Messages"
            blurb="Enquiries from the contact page and from checkout."
            facts={[[String(unreadMessages), 'unread']]}
            warning={unreadMessages > 0 ? 'Needs a reply' : undefined}
          />

          <PageCard
            href="/profile"
            icon={<FiUser size={18} />}
            title="My Profile"
            blurb="Your account and your last 10 actions."
            facts={[[user?.displayName || user?.email || 'Admin', 'signed in']]}
          />

          <PageCard
            href="/settings"
            icon={<FiSettings size={18} />}
            title="Settings"
            blurb="Store details, checkout rules and the activity log."
            facts={[
              [settings.cardPaymentsEnabled ? 'On' : 'Off', 'card payments'],
              [String(settings.shippingCountries.length), 'countries'],
            ]}
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="card p-5">
      <p className="field-label">{label}</p>
      {/* Proportional figures on purpose — `tabular-nums` reads loose at this size. */}
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-heading">{value}</p>
      <p className="mt-1.5 text-xs text-muted">{detail}</p>
    </div>
  );
}

function PageCard({
  href,
  icon,
  title,
  blurb,
  facts,
  warning,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  blurb: string;
  facts: Array<[string, string]>;
  warning?: string;
}) {
  return (
    <Link href={href} className="card group flex flex-col p-5 transition hover:border-brand/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-lg bg-chip p-2.5 text-heading transition group-hover:bg-brand group-hover:text-white">
          {icon}
        </span>
        <FiArrowRight
          size={16}
          className="mt-2 text-faint transition group-hover:translate-x-0.5 group-hover:text-brand"
        />
      </div>

      <h3 className="mt-4 text-base font-bold uppercase tracking-tight text-heading">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted">{blurb}</p>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4">
        {facts.map(([value, label]) => (
          <div key={label} className="min-w-0">
            <dd className="truncate text-lg font-bold tracking-tight text-heading">{value}</dd>
            <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">{label}</dt>
          </div>
        ))}
      </dl>

      {warning && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-warning">
          <FiAlertTriangle size={11} /> {warning}
        </p>
      )}
    </Link>
  );
}
