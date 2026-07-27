import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/firebase/admin';
import {
  CONTACT_LIMITS,
  CONTACT_STATUSES,
  validateContactInput,
  type ContactInput,
  type ContactSenderAccount,
  type ContactStatus,
} from '@/types/contact';

const MESSAGES_COLLECTION = 'contactMessages';
const USERS_COLLECTION = 'carUser';

type Guard = { uid: string } | { response: NextResponse };

function bearerToken(req: NextRequest) {
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
}

/** The contact form is public, but a signed-in sender is worth recording. Never fails the request. */
async function optionalUid(req: NextRequest): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) return null;

  try {
    return (await adminAuth.verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}

async function requireAdmin(req: NextRequest): Promise<Guard> {
  const token = bearerToken(req);
  if (!token) {
    return { response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return { response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }) };
  }

  const snapshot = await adminDb.collection(USERS_COLLECTION).doc(uid).get();
  if (!snapshot.exists || snapshot.data()?.role !== 'admin') {
    return { response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  return { uid };
}

/** Firestore Timestamps become `{_seconds,_nanoseconds}` over JSON, so flatten them to ISO here. */
function toIso(value: unknown): string | null {
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function serialize(docSnap: admin.firestore.QueryDocumentSnapshot) {
  const data = docSnap.data() ?? {};
  return {
    ...data,
    id: docSnap.id,
    createdAt: toIso(data.createdAt),
    senderUid: typeof data.senderUid === 'string' ? data.senderUid : null,
  };
}

/**
 * Pulls the sign-in details for everyone who sent a message while logged in.
 * Auth holds the credentials (providers, verification, last sign-in); `carUser` holds the role.
 */
async function loadSenderAccounts(uids: string[]): Promise<Map<string, ContactSenderAccount>> {
  const accounts = new Map<string, ContactSenderAccount>();
  const unique = Array.from(new Set(uids.filter(Boolean)));
  if (unique.length === 0) return accounts;

  // getUsers / getAll both cap out, so walk the list in chunks.
  const chunks: string[][] = [];
  for (let index = 0; index < unique.length; index += 100) {
    chunks.push(unique.slice(index, index + 100));
  }

  for (const chunk of chunks) {
    const [authResult, profiles] = await Promise.all([
      adminAuth.getUsers(chunk.map((uid) => ({ uid }))),
      adminDb.getAll(...chunk.map((uid) => adminDb.collection(USERS_COLLECTION).doc(uid))),
    ]);

    const profileByUid = new Map(profiles.map((snap) => [snap.id, snap.data() ?? {}]));

    for (const record of authResult.users) {
      const profile = profileByUid.get(record.uid) ?? {};
      accounts.set(record.uid, {
        uid: record.uid,
        accountEmail: record.email ?? (typeof profile.email === 'string' ? profile.email : null),
        displayName: record.displayName ?? (typeof profile.displayName === 'string' ? profile.displayName : null),
        role: typeof profile.role === 'string' ? profile.role : null,
        emailVerified: record.emailVerified,
        disabled: record.disabled,
        providers: record.providerData.map((provider) => provider.providerId),
        accountCreatedAt: record.metadata.creationTime ?? null,
        lastSignInAt: record.metadata.lastSignInTime ?? null,
        lastLoginAt: toIso(profile.lastLogin),
      });
    }

    // A deleted account still leaves its uid on the message — surface what the profile remembers.
    for (const uid of authResult.notFound.map((identifier) => ('uid' in identifier ? identifier.uid : ''))) {
      if (!uid || accounts.has(uid)) continue;
      const profile = profileByUid.get(uid) ?? {};
      accounts.set(uid, {
        uid,
        accountEmail: typeof profile.email === 'string' ? profile.email : null,
        displayName: typeof profile.displayName === 'string' ? profile.displayName : null,
        role: typeof profile.role === 'string' ? profile.role : null,
        emailVerified: false,
        disabled: true,
        providers: [],
        accountCreatedAt: toIso(profile.createdAt),
        lastSignInAt: null,
        lastLoginAt: toIso(profile.lastLogin),
      });
    }
  }

  return accounts;
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
  console.error('[api/contact]', err);
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Public — anyone can send an enquiry from the contact page. */
export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const input: ContactInput = {
      name: str(body.name, CONTACT_LIMITS.name),
      email: str(body.email, CONTACT_LIMITS.email).toLowerCase(),
      phone: str(body.phone, CONTACT_LIMITS.phone),
      subject: str(body.subject, CONTACT_LIMITS.subject),
      // The form labels this "Message"; it is stored as `description`.
      description: str(body.description ?? body.message, CONTACT_LIMITS.description),
    };

    // Never trust the client's own check — the same validator runs again here.
    const errors = validateContactInput(input);
    const firstError = Object.values(errors)[0];
    if (firstError) return NextResponse.json({ error: firstError, errors }, { status: 400 });

    const docRef = await adminDb.collection(MESSAGES_COLLECTION).add({
      ...input,
      status: 'new',
      // Only the uid is stored — the rest of the account is resolved fresh on every admin read.
      senderUid: await optionalUid(req),
      userAgent: req.headers.get('user-agent') ?? '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}

/** Admin only — the inbox of everything visitors have sent, with each sender's account details. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin(req);
    if ('response' in guard) return guard.response;

    const snapshot = await adminDb.collection(MESSAGES_COLLECTION).get();
    const messages = snapshot.docs.map(serialize);
    const accounts = await loadSenderAccounts(messages.map((message) => message.senderUid ?? ''));

    const enriched = messages.map((message) => ({
      ...message,
      sender: message.senderUid ? accounts.get(message.senderUid) ?? null : null,
    }));

    // Sorted in memory so Firestore doesn't need a composite index for this one screen.
    enriched.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));

    return NextResponse.json(enriched);
  } catch (err) {
    return serverError(err);
  }
}

/** Admin only — moves a message between new / read / archived. */
export async function PATCH(req: NextRequest) {
  try {
    const guard = await requireAdmin(req);
    if ('response' in guard) return guard.response;

    const body = await readJson(req);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const id = str(body.id, 200);
    const status = str(body.status, 20) as ContactStatus;
    if (!id) return NextResponse.json({ error: 'Missing message id' }, { status: 400 });
    if (!CONTACT_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Status must be one of: ${CONTACT_STATUSES.join(', ')}` }, { status: 400 });
    }

    const docRef = adminDb.collection(MESSAGES_COLLECTION).doc(id);
    if (!(await docRef.get()).exists) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    await docRef.update({
      status,
      handledBy: guard.uid,
      handledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id, status });
  } catch (err) {
    return serverError(err);
  }
}

/** Admin only. */
export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdmin(req);
    if ('response' in guard) return guard.response;

    const idFromQuery = req.nextUrl.searchParams.get('id');
    const body = idFromQuery ? null : await readJson(req);
    const id = str(idFromQuery ?? body?.id, 200);
    if (!id) return NextResponse.json({ error: 'Missing message id' }, { status: 400 });

    const docRef = adminDb.collection(MESSAGES_COLLECTION).doc(id);
    if (!(await docRef.get()).exists) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return serverError(err);
  }
}
