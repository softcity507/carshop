import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { adminDb } from '@/firebase/admin';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import type { PaymentStatus } from '@/types/order';

const PRODUCTS_COLLECTION = 'products';
const ORDERS_COLLECTION = 'orders';

type OrderRef = admin.firestore.DocumentReference;

/** Orders are found by the id we stashed in metadata, falling back to the session id. */
async function findOrder(orderId: string | null | undefined, sessionId: string): Promise<OrderRef | null> {
  if (orderId) {
    const byId = adminDb.collection(ORDERS_COLLECTION).doc(orderId);
    if ((await byId.get()).exists) return byId;
  }

  const bySession = await adminDb
    .collection(ORDERS_COLLECTION)
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get();

  return bySession.empty ? null : bySession.docs[0].ref;
}

async function fulfillOrder(orderRef: OrderRef, paymentIntentId: string | null) {
  await adminDb.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) return;

    const order = orderSnap.data() ?? {};
    if (order.fulfilled === true) return;

    const items = Array.isArray(order.items) ? order.items : [];
    const productRefs = items.map((item) => adminDb.collection(PRODUCTS_COLLECTION).doc(item.productId));

    // Firestore requires every read in a transaction to happen before the first write.
    const productSnaps = productRefs.length ? await tx.getAll(...productRefs) : [];

    productSnaps.forEach((snap, index) => {
      if (!snap.exists) return;
      const sold = Math.trunc(Number(items[index].quantity) || 0);
      const stock = Math.trunc(Number(snap.data()?.stock) || 0);
      tx.update(snap.ref, {
        stock: Math.max(0, stock - sold),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    tx.update(orderRef, {
      status: 'processing',
      paymentStatus: 'paid',
      fulfilled: true,
      stripePaymentIntentId: paymentIntentId ?? null,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

async function markOrder(orderRef: OrderRef, paymentStatus: PaymentStatus, status?: string) {
  await orderRef.update({
    paymentStatus,
    ...(status ? { status } : {}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function paymentIntentIdOf(session: Stripe.Checkout.Session): string | null {
  const intent = session.payment_intent;
  if (!intent) return null;
  return typeof intent === 'string' ? intent : intent.id;
}

async function handleSessionEvent(session: Stripe.Checkout.Session, type: string) {
  const orderRef = await findOrder(session.metadata?.orderId ?? session.client_reference_id, session.id);
  if (!orderRef) {
    console.warn('[stripe/webhook] no order matches session', session.id);
    return;
  }

  switch (type) {
    case 'checkout.session.completed':
      // Delayed methods (bank debits) complete the session while still `unpaid`; those settle
      // later via async_payment_succeeded.
      if (session.payment_status === 'paid') await fulfillOrder(orderRef, paymentIntentIdOf(session));
      else await markOrder(orderRef, 'unpaid');
      break;

    case 'checkout.session.async_payment_succeeded':
      await fulfillOrder(orderRef, paymentIntentIdOf(session));
      break;

    case 'checkout.session.async_payment_failed':
      await markOrder(orderRef, 'failed', 'cancelled');
      break;

    case 'checkout.session.expired':
      await markOrder(orderRef, 'expired', 'cancelled');
      break;
  }
}

async function handleRefund(charge: Stripe.Charge) {
  const orderId = charge.metadata?.orderId;
  if (!orderId) return;

  const orderRef = adminDb.collection(ORDERS_COLLECTION).doc(orderId);
  if (!(await orderRef.get()).exists) return;

  await markOrder(orderRef, 'refunded', 'cancelled');
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set — refusing unverified events');
    return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });

  // The signature covers the exact bytes Stripe sent, so the body must be read raw — parsing it
  // as JSON first would re-serialise it and break verification.
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
        await handleSessionEvent(event.data.object, event.type);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;

      default:
        break;
    }
  } catch (err) {
    // A non-2xx tells Stripe to retry, which is what we want for a transient Firestore failure.
    console.error(`[stripe/webhook] failed handling ${event.type}`, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
