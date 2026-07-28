import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/firebase/admin';
import { logActivity } from '@/lib/settings';
import { REFUND_REASON_LIMIT, canBuyerRequestRefund, type RefundStatus } from '@/types/order';

const ORDERS_COLLECTION = 'orders';
const USERS_COLLECTION = 'carUser';

const RESOLUTION_NOTE_LIMIT = 1000;

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

function toIso(value: unknown): string | null {
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function serialize(docSnap: admin.firestore.DocumentSnapshot) {
  const data = docSnap.data() ?? {};
  return {
    ...data,
    id: docSnap.id,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    paidAt: toIso(data.paidAt),
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
  console.error('[api/orders/refund]', err);
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * The buyer asks for their money back. Nothing is moved here — this only files the request so it
 * surfaces in the admin console, where a human issues the actual refund through Stripe.
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await requireCaller(req);
    if ('response' in caller) return caller.response;

    const body = await readJson(req);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const id = str(body.id, 200);
    if (!id) return NextResponse.json({ error: 'Missing order id' }, { status: 400 });

    const reason = str(body.reason, REFUND_REASON_LIMIT);
    if (!reason) return NextResponse.json({ error: 'Please tell us why you want a refund.' }, { status: 400 });

    const docRef = adminDb.collection(ORDERS_COLLECTION).doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const order = snapshot.data() ?? {};

    // An admin can file one on a buyer's behalf (over the phone), but nobody else's order.
    if (!caller.isAdmin && order.userId !== caller.uid) {
      return NextResponse.json({ error: 'This order belongs to another account' }, { status: 403 });
    }

    if (!canBuyerRequestRefund({ paymentStatus: order.paymentStatus, refund: order.refund })) {
      const alreadyOpen = order.refund?.status === 'requested' || order.refund?.status === 'approved';
      return NextResponse.json(
        {
          error: alreadyOpen
            ? 'A refund for this order is already being handled.'
            : 'Only a paid order can be refunded.',
        },
        { status: 409 }
      );
    }

    await docRef.update({
      refund: {
        status: 'requested' satisfies RefundStatus,
        reason,
        requestedAt: admin.firestore.Timestamp.now(),
        resolvedAt: null,
        resolvedBy: null,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logActivity(
      caller.uid,
      caller.name,
      `Refund requested on order ${id}`,
      `${order.customer?.fullName ?? 'Buyer'} · ${order.currency ?? ''} ${order.totalAmount ?? 0}\n\n${reason}`
    );

    return NextResponse.json(serialize(await docRef.get()));
  } catch (err) {
    return serverError(err);
  }
}

/**
 * Admin only — records the outcome after the refund has actually been issued (or refused) in
 * Stripe. Approving also marks the order refunded and cancelled, so the two never disagree.
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

    const decision = str(body.decision, 20);
    if (decision !== 'approved' && decision !== 'declined') {
      return NextResponse.json({ error: 'Decision must be approved or declined' }, { status: 400 });
    }

    const docRef = adminDb.collection(ORDERS_COLLECTION).doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const order = snapshot.data() ?? {};
    if (order.refund?.status !== 'requested') {
      return NextResponse.json({ error: 'There is no open refund request on this order' }, { status: 409 });
    }

    await docRef.update({
      refund: {
        ...order.refund,
        status: decision satisfies RefundStatus,
        resolvedAt: admin.firestore.Timestamp.now(),
        resolvedBy: caller.uid,
        resolutionNote: str(body.note, RESOLUTION_NOTE_LIMIT),
      },
      // Approving is a statement that the money has gone back, so the order says so too.
      ...(decision === 'approved' ? { paymentStatus: 'refunded', status: 'cancelled' } : {}),
      updatedBy: caller.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logActivity(caller.uid, caller.name, `Refund ${decision} on order ${id}`, str(body.note, RESOLUTION_NOTE_LIMIT));

    return NextResponse.json(serialize(await docRef.get()));
  } catch (err) {
    return serverError(err);
  }
}
