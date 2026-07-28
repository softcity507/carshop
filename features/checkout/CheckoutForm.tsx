'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiCheckCircle, FiLoader, FiLock, FiPhoneCall } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { SHIPPING_COUNTRIES } from '@/lib/constants';
import { formatMoney } from '@/lib/helpers';
import { CheckoutError, CheckoutService } from '@/services/checkout.service';
import { SettingsService } from '@/services/settings.service';
import {
  CUSTOMER_LIMITS,
  validateCheckoutCustomer,
  type CheckoutCustomer,
  type CheckoutIntent,
} from '@/types/order';

const EMPTY: CheckoutCustomer = {
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

type FieldErrors = Partial<Record<keyof CheckoutCustomer, string>>;

export function CheckoutForm() {
  const { items, subtotal, currency, isCartReady, clearCart } = useCart();
  const { user, isAuthReady } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  /** Only the fields actually typed into. Everything else falls back to the account below. */
  const [typed, setTyped] = useState<Partial<CheckoutCustomer>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  /** Which of the two buttons is working, so only that one shows a spinner. */
  const [busy, setBusy] = useState<CheckoutIntent | null>(null);
  const [enquiryOrderId, setEnquiryOrderId] = useState<string | null>(null);
  /** Which checkout routes and countries the admin has left open — the server enforces this too. */
  const [routes, setRoutes] = useState({ card: true, callback: true });
  const [countryCodes, setCountryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;

    SettingsService.getSettings()
      .then((settings) => {
        if (!active) return;
        setRoutes({ card: settings.cardPaymentsEnabled, callback: settings.callbackRequestsEnabled });
        setCountryCodes(settings.shippingCountries);
      })
      // Everything stays visible if settings can't be read; the server still has the final say.
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const countries = countryCodes
    ? SHIPPING_COUNTRIES.filter((country) => countryCodes.includes(country.code))
    : SHIPPING_COUNTRIES;

  // Prefilling by derivation rather than by effect: the account details are already known at
  // render time, so seeding state from them would only cause an extra pass.
  const draft: CheckoutCustomer = {
    ...EMPTY,
    fullName: user?.displayName ?? '',
    email: user?.email ?? '',
    ...typed,
  };

  // The default country may not be one the store ships to, which would leave the select showing
  // a value it has no option for. Fall back to the first country that is actually offered.
  const customer: CheckoutCustomer = {
    ...draft,
    country: countries.some((country) => country.code === draft.country)
      ? draft.country
      : countries[0]?.code ?? draft.country,
  };

  // Stripe sends abandoned payments back here, with the order already saved.
  useEffect(() => {
    if (searchParams.get('cancelled') !== '1') return;
    toast.info('Payment cancelled — your details are saved, you can try again.');
    router.replace('/checkout');
  }, [searchParams, router]);

  function update(field: keyof CheckoutCustomer, value: string) {
    setTyped((current) => ({ ...current, [field]: value }));
    // Clear the error as soon as the shopper starts fixing that field.
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  async function submit(intent: CheckoutIntent) {
    if (busy) return;

    // Nothing reaches Stripe unless there is a signed-in account behind the order.
    if (!isAuthReady || !user) {
      toast.info('Please login to continue with your order.');
      router.push('/login');
      return;
    }

    const found = validateCheckoutCustomer(customer);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error('Please check the highlighted fields.');
      return;
    }

    setBusy(intent);

    try {
      const result = await CheckoutService.placeOrder(items, customer, intent);

      if (result.intent === 'payment' && result.url) {
        // Leave `busy` set — the browser is on its way out to Stripe.
        window.location.assign(result.url);
        return;
      }

      clearCart();
      setEnquiryOrderId(result.orderId);
    } catch (err) {
      setBusy(null);

      // A Firebase token lasts an hour, so a slow shopper can be signed out by the time they
      // submit. That is a login problem, not a checkout problem — send them back to sign in.
      if (err instanceof CheckoutError && err.isAuthProblem) {
        toast.info('Please login to continue with your order.');
        router.push('/login');
        return;
      }

      // The server re-prices the cart, so this can legitimately fail on a sold-out or
      // re-priced product — surface that message rather than a generic error.
      toast.error(err instanceof Error ? err.message : 'Could not place your order. Please try again.');
    }
  }

  if (!isCartReady || !isAuthReady) {
    return <div className="card h-96 animate-pulse bg-skeleton" />;
  }

  if (enquiryOrderId) {
    return (
      <div className="card mx-auto max-w-2xl px-6 py-16 text-center sm:px-10">
        <FiCheckCircle size={52} className="mx-auto text-success" />
        <h2 className="mt-6 text-2xl font-extrabold uppercase tracking-tight text-heading">
          We&apos;ll call you back
        </h2>
        <p className="mt-3 text-sm text-muted">
          Your order is saved and our sales team has your details. Nothing has been charged.
        </p>
        <p className="mt-6 text-xs uppercase tracking-[0.1em] text-faint">Order {enquiryOrderId}</p>
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

  if (items.length === 0) {
    return (
      <div className="card px-6 py-20 text-center">
        <p className="text-lg font-semibold text-heading">There is nothing to check out</p>
        <p className="mt-2 text-sm text-muted">Add a vehicle or a spare part to your cart first.</p>
        <Link href="/products" className="btn-primary mt-8">
          Browse catalog
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card px-6 py-20 text-center">
        <p className="text-lg font-semibold text-heading">Please sign in to continue</p>
        <p className="mt-2 text-sm text-muted">
          We keep your order against your account so you can track it afterwards.
        </p>
        <Link href="/login" className="btn-primary mt-8">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <form className="card p-6" onSubmit={(event) => event.preventDefault()} noValidate>
        <h2 className="text-lg font-bold uppercase tracking-tight text-heading">Delivery details</h2>
        <p className="mt-2 text-sm text-muted">
          We save these with your order before any payment is taken.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field
            label="Full name"
            value={customer.fullName}
            error={errors.fullName}
            maxLength={CUSTOMER_LIMITS.fullName}
            autoComplete="name"
            onChange={(value) => update('fullName', value)}
          />
          <Field
            label="Email"
            type="email"
            value={customer.email}
            error={errors.email}
            maxLength={CUSTOMER_LIMITS.email}
            autoComplete="email"
            onChange={(value) => update('email', value)}
          />
          <Field
            label="Phone"
            type="tel"
            value={customer.phone}
            error={errors.phone}
            maxLength={CUSTOMER_LIMITS.phone}
            autoComplete="tel"
            onChange={(value) => update('phone', value)}
          />

          <div>
            <label className="field-label" htmlFor="checkout-country">
              Country
            </label>
            <select
              id="checkout-country"
              className="field-input mt-2"
              value={customer.country}
              onChange={(event) => update('country', event.target.value)}
              autoComplete="country"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            {errors.country ? <p className="mt-1.5 text-xs text-brand">{errors.country}</p> : null}
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Street address"
              value={customer.addressLine1}
              error={errors.addressLine1}
              maxLength={CUSTOMER_LIMITS.addressLine1}
              autoComplete="address-line1"
              onChange={(value) => update('addressLine1', value)}
            />
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Apartment, suite (optional)"
              value={customer.addressLine2 ?? ''}
              maxLength={CUSTOMER_LIMITS.addressLine2}
              autoComplete="address-line2"
              onChange={(value) => update('addressLine2', value)}
            />
          </div>

          <Field
            label="City"
            value={customer.city}
            error={errors.city}
            maxLength={CUSTOMER_LIMITS.city}
            autoComplete="address-level2"
            onChange={(value) => update('city', value)}
          />
          <Field
            label="Postal code"
            value={customer.postalCode}
            error={errors.postalCode}
            maxLength={CUSTOMER_LIMITS.postalCode}
            autoComplete="postal-code"
            onChange={(value) => update('postalCode', value)}
          />

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="checkout-notes">
              Notes for our team (optional)
            </label>
            <textarea
              id="checkout-notes"
              rows={4}
              className="field-input mt-2 resize-y"
              maxLength={CUSTOMER_LIMITS.notes}
              value={customer.notes ?? ''}
              onChange={(event) => update('notes', event.target.value)}
              placeholder="Delivery instructions, trade-in questions, preferred call time…"
            />
            {errors.notes ? <p className="mt-1.5 text-xs text-brand">{errors.notes}</p> : null}
          </div>
        </div>
      </form>

      <aside className="card p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold uppercase tracking-tight text-heading">Order Summary</h2>

        <ul className="mt-6 space-y-3 text-sm">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-4">
              <span className="min-w-0 text-muted">
                <span className="font-semibold text-heading">{item.name}</span> × {item.quantity}
              </span>
              <span className="shrink-0 font-semibold text-heading">
                {formatMoney(item.price * item.quantity, item.currency)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-between border-t border-line pt-6">
          <span className="text-sm font-bold uppercase tracking-[0.06em] text-heading">Total</span>
          <span className="text-2xl font-bold tracking-tight text-brand">
            {formatMoney(subtotal, currency)}
          </span>
        </div>

        {routes.card && (
          <button
            type="button"
            onClick={() => submit('payment')}
            disabled={busy !== null}
            className="btn-primary mt-6 w-full"
          >
            {busy === 'payment' ? (
              <>
                <FiLoader size={14} className="animate-spin" /> Redirecting to Stripe
              </>
            ) : (
              <>
                <FiLock size={13} /> Pay securely with Stripe
              </>
            )}
          </button>
        )}

        {routes.callback && (
          <button
            type="button"
            onClick={() => submit('enquiry')}
            disabled={busy !== null}
            className={`btn-outline w-full ${routes.card ? 'mt-3' : 'mt-6'}`}
          >
            {busy === 'enquiry' ? (
              <>
                <FiLoader size={14} className="animate-spin" /> Sending
              </>
            ) : (
              <>
                <FiPhoneCall size={13} /> {routes.card ? 'Request a callback instead' : 'Request a callback'}
              </>
            )}
          </button>
        )}

        {routes.callback && (
          <p className="mt-3 text-center text-[11px] leading-5 text-faint">
            Prefer to talk it through? We&apos;ll save the order and call you — nothing is charged.
          </p>
        )}

        <Link href="/cart" className="btn-ghost mt-4 w-full">
          Back to cart
        </Link>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = 'text',
  maxLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  maxLength?: number;
  autoComplete?: string;
}) {
  const id = `checkout-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;

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
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={`field-input mt-2 ${error ? 'border-brand' : ''}`}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="mt-1.5 text-xs text-brand">{error}</p> : null}
    </div>
  );
}
