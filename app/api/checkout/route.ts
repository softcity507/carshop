import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/firebase/admin';
import { settingsRef } from '@/lib/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { getStripe, isStripeConfigured, resolveAppUrl, toStripeAmount, STRIPE_SETUP_MESSAGE } from '@/lib/stripe';
import {
  CUSTOMER_LIMITS,
  validateCheckoutCustomer,
  type CheckoutCustomer,
  type CheckoutIntent,
  type CheckoutRequestItem,
  type OrderItem,
} from '@/types/order';

const PRODUCTS_COLLECTION = 'products';
const ORDERS_COLLECTION = 'orders';
const MESSAGES_COLLECTION = 'contactMessages';

/** Stripe caps a Checkout line at 100 units and a session at 100 lines. */
const MAX_LINES = 100;
const MAX_QUANTITY_PER_LINE = 100;

type Session = { uid: string; email?: string } | { response: NextResponse };

async function requireUser(req: NextRequest): Promise<Session> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return { response: NextResponse.json({ error: 'Please sign in to check out' }, { status: 401 }) };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return { response: NextResponse.json({ error: 'Your session expired — please sign in again' }, { status: 401 }) };
  }
}

function serverError(err: unknown) {
  console.error('[api/checkout]', err);
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  return NextResponse.json({ error: message }, { status: 500 });
}

function str(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** Accepts only `{ productId, quantity }` — everything priceable is looked up server-side. */
function parseItems(value: unknown): CheckoutRequestItem[] | string {
  if (!Array.isArray(value) || value.length === 0) return 'Your cart is empty';
  if (value.length > MAX_LINES) return `A single order is limited to ${MAX_LINES} different products`;

  const items: CheckoutRequestItem[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    const raw = entry as Record<string, unknown>;
    const productId = typeof raw?.productId === 'string' ? raw.productId.trim() : '';
    const quantity = Math.trunc(Number(raw?.quantity));

    if (!productId) return 'Cart contains an item with no product id';
    if (seen.has(productId)) return 'Cart contains the same product twice';
    if (!Number.isFinite(quantity) || quantity < 1) return 'Cart contains an invalid quantity';
    if (quantity > MAX_QUANTITY_PER_LINE) return `Quantity is limited to ${MAX_QUANTITY_PER_LINE} per product`;

    seen.add(productId);
    items.push({ productId, quantity });
  }

  return items;
}

function parseCustomer(value: unknown, allowedCountries: string[]): CheckoutCustomer | { error: string } {
  const raw = (value ?? {}) as Record<string, unknown>;

  // The optional fields stay as empty strings rather than becoming `undefined`: this object is
  // written to Firestore whole, and an omitted key there is a value error, not an empty field.
  const customer: CheckoutCustomer = {
    fullName: str(raw.fullName, CUSTOMER_LIMITS.fullName),
    email: str(raw.email, CUSTOMER_LIMITS.email).toLowerCase(),
    phone: str(raw.phone, CUSTOMER_LIMITS.phone),
    addressLine1: str(raw.addressLine1, CUSTOMER_LIMITS.addressLine1),
    addressLine2: str(raw.addressLine2, CUSTOMER_LIMITS.addressLine2),
    city: str(raw.city, CUSTOMER_LIMITS.city),
    postalCode: str(raw.postalCode, CUSTOMER_LIMITS.postalCode),
    country: str(raw.country, CUSTOMER_LIMITS.country).toUpperCase(),
    notes: str(raw.notes, CUSTOMER_LIMITS.notes),
  };

  // Never trust the form's own check — the shared validator runs again here.
  const firstError = Object.values(validateCheckoutCustomer(customer))[0];
  if (firstError) return { error: firstError };

  // The admin's shipping list from Settings, not the full catalogue of countries the app knows.
  if (!allowedCountries.includes(customer.country)) {
    return { error: 'We do not ship to that country yet — please contact us instead.' };
  }

  return customer;
}

type PricedLine = { item: OrderItem; currency: string };

/**
 * Re-reads every product from Firestore. The browser's copy of the price is a display cache and
 * an admin may have changed it (or the buyer may have edited localStorage) since it was cached.
 */
async function priceCart(items: CheckoutRequestItem[]): Promise<{ lines: PricedLine[] } | { error: string }> {
  const refs = items.map((item) => adminDb.collection(PRODUCTS_COLLECTION).doc(item.productId));
  const snapshots = await adminDb.getAll(...refs);

  const lines: PricedLine[] = [];

  for (const [index, snapshot] of snapshots.entries()) {
    const { productId, quantity } = items[index];

    if (!snapshot.exists) return { error: 'A product in your cart is no longer available' };

    const data = snapshot.data() ?? {};
    const name = typeof data.name === 'string' ? data.name : 'Product';

    if (data.published === false) return { error: `"${name}" is no longer available` };

    const price = Number(data.price);
    if (!Number.isFinite(price) || price <= 0) return { error: `"${name}" is not priced for online payment` };

    const stock = Math.trunc(Number(data.stock) || 0);
    if (stock < quantity) {
      return { error: stock === 0 ? `"${name}" just sold out` : `Only ${stock} left of "${name}"` };
    }

    lines.push({
      currency: (typeof data.currency === 'string' && data.currency) || 'USD',
      item: {
        productId,
        quantity,
        price,
        name,
        // Same reason as the customer block: a product with no images must not put `undefined`
        // into the order document.
        imageUrl: (Array.isArray(data.imageUrls) ? data.imageUrls[0] : '') || '',
      },
    });
  }

  // Stripe bills one session in one currency; a mixed cart has to be split by the shopper.
  const currencies = new Set(lines.map((line) => line.currency.toUpperCase()));
  if (currencies.size > 1) {
    return { error: 'Your cart mixes currencies — please check out each currency separately' };
  }

  return { lines };
}

/**
 * Raises the enquiry in the same inbox the contact page feeds, so sales sees callback requests
 * next to every other message instead of having to watch a second screen.
 */
async function raiseEnquiry(orderId: string, customer: CheckoutCustomer, lines: PricedLine[], total: string, uid: string) {
  const summary = lines
    .map(({ item }) => `• ${item.name} × ${item.quantity}`)
    .join('\n');

  const address = [customer.addressLine1, customer.addressLine2, customer.city, customer.postalCode, customer.country]
    .filter(Boolean)
    .join(', ');

  const docRef = await adminDb.collection(MESSAGES_COLLECTION).add({
    name: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    subject: `Callback request — order ${orderId}`,
    description:
      `A customer asked to be contacted instead of paying online.\n\n` +
      `Order: ${orderId}\nTotal: ${total}\n\nItems:\n${summary}\n\n` +
      `Deliver to: ${address}` +
      (customer.notes ? `\n\nTheir note:\n${customer.notes}` : ''),
    status: 'new',
    senderUid: uid,
    orderId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    if ('response' in session) return session.response;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const intent: CheckoutIntent = body?.intent === 'enquiry' ? 'enquiry' : 'payment';

    // The admin can close either route from Settings; enforce it here rather than trusting the
    // form to have hidden the button.
    const settings = { ...DEFAULT_SETTINGS, ...((await settingsRef().get()).data() ?? {}) };
    if (intent === 'payment' && !settings.cardPaymentsEnabled) {
      return NextResponse.json({ error: 'Card payments are switched off right now.' }, { status: 503 });
    }
    if (intent === 'enquiry' && !settings.callbackRequestsEnabled) {
      return NextResponse.json({ error: 'Callback requests are switched off right now.' }, { status: 503 });
    }

    // Only the card route needs Stripe, so an unconfigured deployment can still take enquiries.
    if (intent === 'payment' && !isStripeConfigured()) {
      return NextResponse.json({ error: STRIPE_SETUP_MESSAGE }, { status: 503 });
    }

    const parsedItems = parseItems(body?.items);
    if (typeof parsedItems === 'string') return NextResponse.json({ error: parsedItems }, { status: 400 });

    const customer = parseCustomer(body?.customer, settings.shippingCountries);
    if ('error' in customer) return NextResponse.json({ error: customer.error }, { status: 400 });

    const priced = await priceCart(parsedItems);
    if ('error' in priced) return NextResponse.json({ error: priced.error }, { status: 409 });

    const { lines } = priced;
    const currency = lines[0].currency.toUpperCase();
    const totalAmount = lines.reduce((sum, line) => sum + line.item.price * line.item.quantity, 0);

    // The order — including the delivery details typed on the checkout page — is persisted before
    // Stripe is ever opened. If the shopper abandons the payment we still know what they wanted
    // and how to reach them, and the webhook always has a row to settle.
    const orderRef = await adminDb.collection(ORDERS_COLLECTION).add({
      userId: session.uid,
      email: customer.email || session.email || null,
      customer,
      intent,
      items: lines.map((line) => line.item),
      totalAmount,
      currency,
      status: 'pending',
      paymentStatus: 'unpaid',
      fulfilled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (intent === 'enquiry') {
      const contactMessageId = await raiseEnquiry(
        orderRef.id,
        customer,
        lines,
        `${currency} ${totalAmount.toLocaleString()}`,
        session.uid
      );

      await orderRef.update({
        contactMessageId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ intent, orderId: orderRef.id });
    }

    const appUrl = resolveAppUrl(req.url);
    const stripe = getStripe();

    const checkout = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        // Wallets (Apple Pay, Google Pay, Link) switch themselves on from the Stripe Dashboard's
        // payment-method settings — no extra configuration needed here.
        line_items: lines.map(({ item }) => ({
          quantity: item.quantity,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: toStripeAmount(item.price, currency),
            product_data: {
              name: item.name,
              images: item.imageUrl?.startsWith('https://') ? [item.imageUrl] : undefined,
              metadata: { productId: item.productId },
            },
          },
        })),
        customer_email: customer.email,
        client_reference_id: orderRef.id,
        metadata: { orderId: orderRef.id, userId: session.uid },
        payment_intent_data: {
          metadata: { orderId: orderRef.id, userId: session.uid },
          description: `CarShop order ${orderRef.id}`,
          // Carried over from our own form, so Stripe's receipt and the dashboard show where this
          // is going without making the shopper type the address a second time.
          shipping: {
            name: customer.fullName,
            phone: customer.phone,
            address: {
              line1: customer.addressLine1,
              // Stripe wants the key omitted rather than blank when there is no second line.
              line2: customer.addressLine2 || undefined,
              city: customer.city,
              postal_code: customer.postalCode,
              country: customer.country,
            },
          },
        },
        allow_promotion_codes: true,
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout?cancelled=1`,
      },
      // Retrying a failed request must not charge twice or open a second session.
      { idempotencyKey: `order_${orderRef.id}` }
    );

    if (!checkout.url) {
      await orderRef.update({ status: 'cancelled', paymentStatus: 'failed' });
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 });
    }

    await orderRef.update({
      stripeSessionId: checkout.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ intent, url: checkout.url, orderId: orderRef.id });
  } catch (err) {
    return serverError(err);
  }
}

/** Powers the success screen: `/api/checkout?session_id=cs_...`. */
export async function GET(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: STRIPE_SETUP_MESSAGE }, { status: 503 });
    }

    const sessionId = req.nextUrl.searchParams.get('session_id')?.trim();
    if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const snapshot = await adminDb
      .collection(ORDERS_COLLECTION)
      .where('stripeSessionId', '==', sessionId)
      .limit(1)
      .get();

    if (snapshot.empty) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const doc = snapshot.docs[0];
    const order = doc.data();

    if (order.userId !== auth.uid) {
      return NextResponse.json({ error: 'This order belongs to another account' }, { status: 403 });
    }

    // Webhooks can land a beat after the redirect, so read Stripe directly for the live status
    // rather than showing "unpaid" to someone who just paid.
    const checkout = await getStripe().checkout.sessions.retrieve(sessionId);
    const paid = checkout.payment_status === 'paid';

    return NextResponse.json({
      orderId: doc.id,
      paid,
      paymentStatus: paid ? 'paid' : order.paymentStatus ?? 'unpaid',
      status: order.status ?? 'pending',
      totalAmount: order.totalAmount ?? 0,
      currency: order.currency ?? 'USD',
      email: checkout.customer_details?.email ?? order.email ?? null,
      items: order.items ?? [],
    });
  } catch (err) {
    return serverError(err);
  }
}
