export interface OrderItem {
  productId: string;
  quantity: number;
  /** Unit price re-read from Firestore at checkout — never the number the browser sent. */
  price: number;
  name: string;
  imageUrl?: string;
}

export const ORDER_STATUSES = ['pending', 'processing', 'completed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Mirrors the Stripe Checkout Session lifecycle, so the dashboard can show where a payment stalled. */
export const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded', 'failed', 'expired'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * How the buyer chose to complete the order. Cars are often not bought on a card, so an order can
 * be placed as an enquiry for sales to call back instead of going through Stripe.
 */
export type CheckoutIntent = 'payment' | 'enquiry';

/** Delivery and contact details, captured and stored before Stripe is ever opened. */
export interface CheckoutCustomer {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2. Stripe's address collection needs the country, not a free-text name. */
  country: string;
  notes?: string;
}

export interface Order {
  id: string;
  userId: string;
  email?: string;
  customer: CheckoutCustomer;
  intent: CheckoutIntent;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** Set as soon as the session is created, so the webhook can find this order again. */
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  /** Links an enquiry order to the message it raised in the admin inbox. */
  contactMessageId?: string;
  /** Internal note kept alongside the order — never shown to the buyer. */
  adminNote?: string;
  /** True once the webhook has decremented stock — guards against duplicate Stripe deliveries. */
  fulfilled?: boolean;
  createdAt: string;
  updatedAt?: string;
}

/** What the browser is allowed to send. Prices and names are resolved server-side. */
export interface CheckoutRequestItem {
  productId: string;
  quantity: number;
}

export const CUSTOMER_LIMITS = {
  fullName: 80,
  email: 160,
  phone: 30,
  addressLine1: 160,
  addressLine2: 160,
  city: 80,
  postalCode: 20,
  country: 2,
  notes: 1000,
} as const;

/**
 * Single source of validation truth, run in the form and again in the route handler so both
 * reject exactly the same input.
 */
export function validateCheckoutCustomer(
  input: Partial<CheckoutCustomer>
): Partial<Record<keyof CheckoutCustomer, string>> {
  const errors: Partial<Record<keyof CheckoutCustomer, string>> = {};
  const value = (key: keyof CheckoutCustomer) => (input[key] ?? '').trim();

  const fullName = value('fullName');
  if (!fullName) errors.fullName = 'Please enter your full name.';
  else if (fullName.length > CUSTOMER_LIMITS.fullName) errors.fullName = 'That name is too long.';

  const email = value('email');
  if (!email) errors.email = 'We need an email address for your receipt.';
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'That email address does not look right.';
  else if (email.length > CUSTOMER_LIMITS.email) errors.email = 'That email address is too long.';

  const phone = value('phone');
  if (!phone) errors.phone = 'A phone number lets us reach you about delivery.';
  else if (phone.replace(/\D/g, '').length < 7) errors.phone = 'That phone number looks too short.';
  else if (phone.length > CUSTOMER_LIMITS.phone) errors.phone = 'That phone number is too long.';

  if (!value('addressLine1')) errors.addressLine1 = 'Please enter your street address.';
  if (!value('city')) errors.city = 'Please enter your city.';

  const country = value('country');
  if (!country) errors.country = 'Please choose your country.';
  else if (!/^[A-Za-z]{2}$/.test(country)) errors.country = 'Country must be a 2-letter code.';

  if (value('notes').length > CUSTOMER_LIMITS.notes) errors.notes = 'Please shorten your note.';

  return errors;
}

/** What an admin is allowed to change on an existing order from the dashboard. */
export interface OrderPatch {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customer?: CheckoutCustomer;
  /** Internal note kept alongside the order — never shown to the buyer. */
  adminNote?: string;
}
