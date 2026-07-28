import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/firebase/admin';
import { notesRef } from '@/lib/settings';
import { NOTE_LIMITS, validateNote } from '@/types/settings';

const USERS_COLLECTION = 'carUser';

type Guard = { uid: string; name: string } | { response: NextResponse };

/** The log is internal, so both reading and writing it are admin-only. */
async function requireAdmin(req: NextRequest): Promise<Guard> {
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
  if (!snapshot.exists || profile?.role !== 'admin') {
    return { response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  const name =
    (typeof profile?.displayName === 'string' && profile.displayName) ||
    decoded.name ||
    decoded.email ||
    'Admin';

  return { uid: decoded.uid, name };
}

function toIso(value: unknown): string | null {
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function serialize(docSnap: admin.firestore.QueryDocumentSnapshot) {
  const data = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    kind: data.kind === 'activity' ? ('activity' as const) : ('note' as const),
    title: typeof data.title === 'string' ? data.title : '',
    body: typeof data.body === 'string' ? data.body : '',
    date: typeof data.date === 'string' ? data.date : '',
    authorUid: typeof data.authorUid === 'string' ? data.authorUid : '',
    authorName: typeof data.authorName === 'string' ? data.authorName : 'Admin',
    createdAt: toIso(data.createdAt),
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
  console.error('[api/settings/notes]', err);
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  return NextResponse.json({ error: message }, { status: 500 });
}

/** The whole log, newest activity first. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin(req);
    if ('response' in guard) return guard.response;

    const snapshot = await notesRef().get();
    const notes = snapshot.docs.map(serialize);

    // Sorted in memory so Firestore doesn't need a composite index; `date` is the activity day and
    // `createdAt` breaks ties between several notes logged for the same day.
    notes.sort(
      (a, b) =>
        b.date.localeCompare(a.date) || String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
    );

    return NextResponse.json(notes);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req);
    if ('response' in guard) return guard.response;

    const body = await readJson(req);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const note = {
      title: str(body.title, NOTE_LIMITS.title),
      body: str(body.body, NOTE_LIMITS.body),
      date: str(body.date, 10),
    };

    const firstError = Object.values(validateNote(note))[0];
    if (firstError) return NextResponse.json({ error: firstError }, { status: 400 });

    const docRef = await notesRef().add({
      ...note,
      // Anything posted here is hand-written; `activity` entries are only ever written by the
      // server when an admin actually does something.
      kind: 'note',
      authorUid: guard.uid,
      authorName: guard.name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json(serialize(await docRef.get() as admin.firestore.QueryDocumentSnapshot), {
      status: 201,
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdmin(req);
    if ('response' in guard) return guard.response;

    const idFromQuery = req.nextUrl.searchParams.get('id');
    const body = idFromQuery ? null : await readJson(req);
    const id = str(idFromQuery ?? body?.id, 200);
    if (!id) return NextResponse.json({ error: 'Missing note id' }, { status: 400 });

    const docRef = notesRef().doc(id);
    if (!(await docRef.get()).exists) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return serverError(err);
  }
}
