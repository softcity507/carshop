/**
 * Everything an admin can configure about the store, held in a single Firestore document
 * (`settings/store`). One document means one read to load the whole configuration and one write
 * to save it — no partial states where half the settings applied and half did not.
 */
export interface StoreSettings {
  /* Identity */
  storeName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  address: string;

  /* Checkout */
  cardPaymentsEnabled: boolean;
  callbackRequestsEnabled: boolean;
  defaultCurrency: string;
  /** ISO 3166-1 alpha-2 codes the checkout will accept. */
  shippingCountries: string[];

  /* Catalog */
  publishNewProducts: boolean;
  featuredLimit: number;
  lowStockThreshold: number;

  updatedAt?: string | null;
  updatedBy?: string | null;
}

export const SETTINGS_LIMITS = {
  storeName: 80,
  tagline: 160,
  supportEmail: 160,
  supportPhone: 30,
  address: 240,
  featuredLimitMax: 24,
  lowStockThresholdMax: 999,
} as const;

/** Used before the document exists, and as the fallback for any field missing from it. */
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'CarShop',
  tagline: 'Premium vehicles and genuine spare parts.',
  supportEmail: '',
  supportPhone: '',
  address: '',

  cardPaymentsEnabled: true,
  callbackRequestsEnabled: true,
  defaultCurrency: 'USD',
  shippingCountries: ['US', 'CA', 'GB', 'AE', 'PK'],

  publishNewProducts: true,
  featuredLimit: 8,
  lowStockThreshold: 3,

  updatedAt: null,
  updatedBy: null,
};

/** Shared by the form and the route handler, so both reject the same input. */
export function validateSettings(input: Partial<StoreSettings>): Partial<Record<keyof StoreSettings, string>> {
  const errors: Partial<Record<keyof StoreSettings, string>> = {};

  const storeName = (input.storeName ?? '').trim();
  if (!storeName) errors.storeName = 'The store needs a name.';
  else if (storeName.length > SETTINGS_LIMITS.storeName) errors.storeName = 'That name is too long.';

  if ((input.tagline ?? '').length > SETTINGS_LIMITS.tagline) errors.tagline = 'Keep the tagline shorter.';

  const supportEmail = (input.supportEmail ?? '').trim();
  if (!supportEmail) errors.supportEmail = 'Customers need an address to write to.';
  else if (!/^\S+@\S+\.\S+$/.test(supportEmail)) errors.supportEmail = 'That email address does not look right.';

  if ((input.supportPhone ?? '').length > SETTINGS_LIMITS.supportPhone) {
    errors.supportPhone = 'That phone number is too long.';
  }
  if ((input.address ?? '').length > SETTINGS_LIMITS.address) errors.address = 'That address is too long.';

  if (!input.shippingCountries?.length) {
    errors.shippingCountries = 'Pick at least one country you ship to.';
  }

  if (!(input.defaultCurrency ?? '').trim()) errors.defaultCurrency = 'Choose a default currency.';

  const featuredLimit = Number(input.featuredLimit);
  if (!Number.isInteger(featuredLimit) || featuredLimit < 1 || featuredLimit > SETTINGS_LIMITS.featuredLimitMax) {
    errors.featuredLimit = `Pick a number between 1 and ${SETTINGS_LIMITS.featuredLimitMax}.`;
  }

  const lowStock = Number(input.lowStockThreshold);
  if (!Number.isInteger(lowStock) || lowStock < 0 || lowStock > SETTINGS_LIMITS.lowStockThresholdMax) {
    errors.lowStockThreshold = `Pick a number between 0 and ${SETTINGS_LIMITS.lowStockThresholdMax}.`;
  }

  // Card payments cannot be the only route if they are also switched off.
  if (!input.cardPaymentsEnabled && !input.callbackRequestsEnabled) {
    errors.cardPaymentsEnabled = 'Leave at least one checkout route switched on.';
  }

  return errors;
}

/**
 * A dated entry in the store's running log — what happened, in the admin's own words. Kept as a
 * subcollection of the settings document so the whole admin configuration lives under one root.
 */
export interface ActivityNote {
  id: string;
  /** `note` was written by an admin; `activity` was recorded automatically when they acted. */
  kind: 'note' | 'activity';
  title: string;
  body: string;
  /** The day the activity happened (`YYYY-MM-DD`), which need not be the day it was written up. */
  date: string;
  authorUid: string;
  authorName: string;
  createdAt: string | null;
}

export const NOTE_LIMITS = {
  title: 120,
  body: 20_000,
  bodyMin: 3,
} as const;

export function validateNote(input: { title?: string; body?: string; date?: string }) {
  const errors: { title?: string; body?: string; date?: string } = {};

  if ((input.title ?? '').length > NOTE_LIMITS.title) errors.title = 'Keep the title shorter.';

  const body = (input.body ?? '').trim();
  if (!body) errors.body = 'Write what happened.';
  else if (body.length < NOTE_LIMITS.bodyMin) errors.body = 'Add a little more detail.';
  else if (body.length > NOTE_LIMITS.body) errors.body = 'That note is too long to store.';

  const date = (input.date ?? '').trim();
  if (!date) errors.date = 'Pick the day this happened.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = 'Use the date picker.';

  return errors;
}
