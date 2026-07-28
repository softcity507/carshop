import Stripe from 'stripe';

export const STRIPE_SETUP_MESSAGE =
  'Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local, then restart the dev server.';

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;

/**
 * Created on first use rather than at import time: `next build` evaluates route modules during its
 * static pass, and a missing key there would fail the build instead of the request.
 */
export function getStripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error(STRIPE_SETUP_MESSAGE);

  // No `apiVersion` override — the SDK pins the version it was generated against.
  client = new Stripe(key, { typescript: true });
  return client;
}

/**
 * Currencies Stripe bills in whole units. Sending 1000 for a ¥1000 charge would otherwise
 * be read as ¥100,000.
 */
const ZERO_DECIMAL = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga',
  'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

/** Converts a display price into the minor-unit integer Stripe expects. */
export function toStripeAmount(amount: number, currency: string): number {
  const code = currency.toLowerCase();
  if (ZERO_DECIMAL.has(code)) return Math.round(amount);
  return Math.round(amount * 100);
}

/** Inverse of {@link toStripeAmount} — for rendering totals that came back from Stripe. */
export function fromStripeAmount(amount: number, currency: string): number {
  const code = currency.toLowerCase();
  if (ZERO_DECIMAL.has(code)) return amount;
  return amount / 100;
}

/**
 * Absolute base for Stripe's return URLs. Stripe rejects relative paths, and on Vercel the
 * deployment host is only known at runtime, so fall back to the request's own origin.
 */
export function resolveAppUrl(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return new URL(requestUrl).origin;
}
