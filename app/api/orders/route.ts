import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/firebase/admin';
import { SHIPPING_COUNTRY_CODES } from '@/lib/constants';
import { logActivity } from '@/lib/settings';
import {
  CUSTOMER_LIMITS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  canBuyerDelete,
  validateCheckoutCustomer,
  type CheckoutCustomer,
  type OrderStatus,
  type PaymentStatus,
} from '@/types/order';

const ORDERS_COLLECTION = 'orders';
const USERS_COLLECTION = 'carUser';

const ADMIN_NOTE_LIMIT = 2000;

type Caller = { uid: string; name: string; isAdmin: boolean } | { response: NextResponse };

async function requireCaller(req: NextRequest): Promise<Caller> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return { response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return { response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }) };
  }

  const snapshot = await adminDb.collection(USERS_COLLECTION).doc(decoded.uid).get();
  const profile = snapshot.data();
  const name =
    (typeof profile?.displayName === 'string' && profile.displayName) || decoded.name || decoded.email || 'Admin';

  return { uid: decoded.uid, name, isAdmin: snapshot.exists && profile?.role === 'admin' };
}

/** Firestore Timestamps become `{_seconds,_nanoseconds}` over JSON, so flatten them to ISO here. */
function toIso(value: unknown): string | null {
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function serialize(docSnap: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot) {
  const data = docSnap.data() ?? {};
  return {
    ...data,
    id: docSnap.id,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    paidAt: toIso(data.paidAt),
    // The refund block carries its own Timestamps, which need the same flattening.
    refund: data.refund
      ? {
          ...data.refund,
          requestedAt: toIso(data.refund.requestedAt),
          resolvedAt: toIso(data.refund.resolvedAt),
        }
      : undefined,
  };
}

function str(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function serverError(err: unknown) {
  console.error('[api/orders]', err);
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Same shape and rules the checkout form used, so an admin edit can't write an invalid address. */
function parseCustomer(value: unknown): CheckoutCustomer | { error: string } {
  const raw = (value ?? {}) as Record<string, unknown>;

  const customer: CheckoutCustomer = {
    fullName: str(raw.fullName, CUSTOMER_LIMITS.fullName),
    email: str(raw.email, CUSTOMER_LIMITS.email).toLowerCase(),
    phone: str(raw.phone, CUSTOMER_LIMITS.phone),
    addressLine1: str(raw.addressLine1, CUSTOMER_LIMITS.addressLine1),
    addressLine2: str(raw.addressLine2, CUSTOMER_LIMITS.addressLine2) || undefined,
    city: str(raw.city, CUSTOMER_LIMITS.city),
    postalCode: str(raw.postalCode, CUSTOMER_LIMITS.postalCode),
    country: str(raw.country, CUSTOMER_LIMITS.country).toUpperCase(),
    notes: str(raw.notes, CUSTOMER_LIMITS.notes) || undefined,
  };

  const firstError = Object.values(validateCheckoutCustomer(customer))[0];
  if (firstError) return { error: firstError };

  if (!SHIPPING_COUNTRY_CODES.includes(customer.country as (typeof SHIPPING_COUNTRY_CODES)[number])) {
    return { error: 'That country is not on the shipping list.' };
  }

  return customer;
}

/**
 * Admins see every order; everyone else sees only their own. `?mine=true` narrows it to the
 * caller's own orders regardless of role, which is what the customer-facing history screen wants
 * even when an admin is the one looking at it.
 */
export async function GET(req: NextRequest) {
  try {
    const caller = await requireCaller(req);
    if ('response' in caller) return caller.response;

    const onlyMine = req.nextUrl.searchParams.get('mine') === 'true';

    const collection = adminDb.collection(ORDERS_COLLECTION);
    const snapshot =
      caller.isAdmin && !onlyMine
        ? await collection.get()
        : await collection.where('userId', '==', caller.uid).get();

    const orders = snapshot.docs.map(serialize);
    // Sorted in memory so Firestore doesn't need a composite index for the per-user query.
    orders.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));

    return NextResponse.json(orders);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * Admin only — corrects the details of an order that already exists: where it is in the pipeline,
 * how the payment settled, and the delivery address (buyers mistype these constantly).
 *
 * Line items and totals are deliberately not editable here: they are what Stripe actually charged,
 * so changing them would put the order and the payment out of step.
 */
export async function PATCH(req: NextRequest) {
  try {
    const caller = await requireCaller(req);
    if ('response' in caller) return caller.response;
    if (!caller.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await readJson(req);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const id = str(body.id, 200);
    if (!id) return NextResponse.json({ error: 'Missing order id' }, { status: 400 });

    const update: Record<string, unknown> = {};

    if (body.status !== undefined) {
      const status = str(body.status, 20) as OrderStatus;
      if (!ORDER_STATUSES.includes(status)) {
        return NextResponse.json({ error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` }, { status: 400 });
      }
      update.status = status;
    }

    if (body.paymentStatus !== undefined) {
      const paymentStatus = str(body.paymentStatus, 20) as PaymentStatus;
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return NextResponse.json(
          { error: `Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      update.paymentStatus = paymentStatus;
    }

    if (body.customer !== undefined) {
      const customer = parseCustomer(body.customer);
      if ('error' in customer) return NextResponse.json({ error: customer.error }, { status: 400 });
      update.customer = customer;
      update.email = customer.email;
    }

    if (body.adminNote !== undefined) {
      update.adminNote = str(body.adminNote, ADMIN_NOTE_LIMIT);
    }

    // "Completed" and "paid" describe the same finished order, so moving one moves the other.
    // Only ever applied to the side the admin left alone — sending both explicitly wins, which is
    // how you still record the odd combination (a completed order later refunded, say).
    if (update.status === 'completed' && update.paymentStatus === undefined) {
      update.paymentStatus = 'paid';
    } else if (update.paymentStatus === 'paid' && update.status === undefined) {
      update.status = 'completed';
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const docRef = adminDb.collection(ORDERS_COLLECTION).doc(id);
    if (!(await docRef.get()).exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    await docRef.update({
      ...update,
      updatedBy: caller.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logActivity(
      caller.uid,
      caller.name,
      `Order ${id} updated`,
      Object.keys(update)
        .map((field) => (field === 'customer' ? 'delivery details' : field))
        .join(', ')
    );

    return NextResponse.json(serialize(await docRef.get()));
  } catch (err) {
    return serverError(err);
  }
}

/**
 * Removes the order record.
 *
 * An admin may delete any order. A buyer may delete only their own, and only while it is still
 * unpaid — once money has moved the record has to survive, so that case has to go through a
 * refund request instead. Neither path touches Stripe: refund a charge in the Stripe dashboard
 * before deleting the row behind it.
 */
export async function DELETE(req: NextRequest) {
  try {
    const caller = await requireCaller(req);
    if ('response' in caller) return caller.response;

    const idFromQuery = req.nextUrl.searchParams.get('id');
    const body = idFromQuery ? null : await readJson(req);
    const id = str(idFromQuery ?? body?.id, 200);
    if (!id) return NextResponse.json({ error: 'Missing order id' }, { status: 400 });

    const docRef = adminDb.collection(ORDERS_COLLECTION).doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = existing.data() ?? {};

    if (!caller.isAdmin) {
      if (order.userId !== caller.uid) {
        return NextResponse.json({ error: 'This order belongs to another account' }, { status: 403 });
      }
      if (!canBuyerDelete({ paymentStatus: order.paymentStatus, fulfilled: order.fulfilled })) {
        return NextResponse.json(
          { error: 'This order has already been paid — request a refund instead of deleting it.' },
          { status: 409 }
        );
      }
    }

    await docRef.delete();

    // Deletions are the one action with nothing left behind to inspect, so the log is the record.
    logActivity(
      caller.uid,
      caller.name,
      caller.isAdmin ? `Order ${id} deleted` : `Order ${id} cancelled by the buyer`,
      `${order.customer?.fullName ?? 'Unknown buyer'} · ${order.currency ?? ''} ${order.totalAmount ?? 0} · payment was ${order.paymentStatus ?? 'unknown'}`
    );

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return serverError(err);
  }
}
