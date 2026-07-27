import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminDb } from '@/firebase/admin';

const PRODUCTS_COLLECTION = 'products';

function toIso(value: unknown): string | null {
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

/** Public detail lookup. Drafts stay hidden here — the admin UI reads them through the list route. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 });

    const snapshot = await adminDb.collection(PRODUCTS_COLLECTION).doc(id).get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const data = snapshot.data() ?? {};
    if (data.published === false) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      id: snapshot.id,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
    });
  } catch (err) {
    console.error('[api/products/:id]', err);
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
