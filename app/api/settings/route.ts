import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/firebase/admin';
import { CURRENCY_CODES, SHIPPING_COUNTRY_CODES } from '@/lib/constants';
import { logActivity, settingsRef } from '@/lib/settings';
import { DEFAULT_SETTINGS, SETTINGS_LIMITS, validateSettings, type StoreSettings } from '@/types/settings';

const USERS_COLLECTION = 'carUser';

type Guard = { uid: string; name: string } | { response: NextResponse };

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
    (typeof profile?.displayName === 'string' && profile.displayName) || decoded.name || decoded.email || 'Admin';

  return { uid: decoded.uid, name };
}

function toIso(value: unknown): string | null {
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function str(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function int(value: unknown, fallback: number) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function serverError(err: unknown) {
  console.error('[api/settings]', err);
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Missing fields fall back to the defaults, so a partial document never breaks a caller. */
function merge(data: admin.firestore.DocumentData | undefined): StoreSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(data ?? {}),
    updatedAt: toIso(data?.updatedAt),
    updatedBy: typeof data?.updatedBy === 'string' ? data.updatedBy : null,
  };
}

/**
 * Public read. Nothing here is a secret — the storefront needs the store name, support contacts
 * and which checkout routes are open. Keys and credentials stay in environment variables.
 */
export async function GET() {
  try {
    const snapshot = await settingsRef().get();
    return NextResponse.json(merge(snapshot.data()));
  } catch (err) {
    return serverError(err);
  }
}

/** Admin only — replaces the whole document, so the saved state always matches the form. */
export async function PUT(req: NextRequest) {
  try {
    const guard = await requireAdmin(req);
    if ('response' in guard) return guard.response;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const shippingCountries = Array.isArray(body.shippingCountries)
      ? Array.from(
          new Set(
            body.shippingCountries
              .map((code) => str(code, 2).toUpperCase())
              .filter((code): code is (typeof SHIPPING_COUNTRY_CODES)[number] =>
                SHIPPING_COUNTRY_CODES.includes(code as (typeof SHIPPING_COUNTRY_CODES)[number])
              )
          )
        )
      : [];

    const defaultCurrency = str(body.defaultCurrency, 3).toUpperCase();

    const settings: StoreSettings = {
      storeName: str(body.storeName, SETTINGS_LIMITS.storeName),
      tagline: str(body.tagline, SETTINGS_LIMITS.tagline),
      supportEmail: str(body.supportEmail, SETTINGS_LIMITS.supportEmail).toLowerCase(),
      supportPhone: str(body.supportPhone, SETTINGS_LIMITS.supportPhone),
      address: str(body.address, SETTINGS_LIMITS.address),

      cardPaymentsEnabled: bool(body.cardPaymentsEnabled, DEFAULT_SETTINGS.cardPaymentsEnabled),
      callbackRequestsEnabled: bool(body.callbackRequestsEnabled, DEFAULT_SETTINGS.callbackRequestsEnabled),
      defaultCurrency: CURRENCY_CODES.includes(defaultCurrency as (typeof CURRENCY_CODES)[number])
        ? defaultCurrency
        : '',
      shippingCountries,

      publishNewProducts: bool(body.publishNewProducts, DEFAULT_SETTINGS.publishNewProducts),
      featuredLimit: int(body.featuredLimit, DEFAULT_SETTINGS.featuredLimit),
      lowStockThreshold: int(body.lowStockThreshold, DEFAULT_SETTINGS.lowStockThreshold),
    };

    // Never trust the form's own check — the shared validator runs again here.
    const firstError = Object.values(validateSettings(settings))[0];
    if (firstError) return NextResponse.json({ error: firstError }, { status: 400 });

    await settingsRef().set(
      {
        ...settings,
        updatedBy: guard.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: false }
    );

    logActivity(guard.uid, guard.name, 'Store settings updated');

    return NextResponse.json(merge((await settingsRef().get()).data()));
  } catch (err) {
    return serverError(err);
  }
}
