import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/firebase/admin';
import {
  BODY_STYLES,
  CAR_CONDITIONS,
  DRIVETRAINS,
  FUEL_TYPES,
  PART_CATEGORIES,
  PART_CONDITIONS,
  TRANSMISSIONS,
} from '@/types/product';

const PRODUCTS_COLLECTION = 'products';
const USERS_COLLECTION = 'carUser';

type Guard = { uid: string } | { response: NextResponse };

async function requireAdmin(req: NextRequest): Promise<Guard> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
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

function serialize(docSnap: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot) {
  const data = docSnap.data() ?? {};
  return {
    ...data,
    id: docSnap.id,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function str(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function num(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => str(entry)).filter(Boolean);
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  const candidate = str(value);
  return (allowed as readonly string[]).includes(candidate) ? (candidate as T[number]) : fallback;
}

/** Strips undefined — Firestore rejects undefined values outright. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function buildProduct(body: Record<string, unknown>) {
  const name = str(body.name);
  const price = num(body.price);
  const type = body.type === 'part' ? 'part' : 'car';

  if (!name) return { error: 'Product name is required' };
  if (price === undefined || price < 0) return { error: 'A valid price is required' };

  const base = {
    type,
    name,
    description: str(body.description),
    price,
    currency: str(body.currency) || 'USD',
    badge: str(body.badge),
    imageUrls: strList(body.imageUrls),
    stock: Math.max(0, Math.trunc(num(body.stock) ?? 0)),
    published: body.published !== false,
    featured: body.featured === true,
  };

  if (type === 'car') {
    const car = (body.car ?? {}) as Record<string, unknown>;
    const make = str(car.make);
    const model = str(car.model);
    const year = num(car.year);

    if (!make || !model) return { error: 'Car make and model are required' };
    if (year === undefined || year < 1900 || year > 2100) return { error: 'A valid car year is required' };

    return {
      data: {
        ...base,
        car: compact({
          make,
          model,
          year: Math.trunc(year),
          trim: str(car.trim) || undefined,
          condition: oneOf(car.condition, CAR_CONDITIONS, 'new'),
          bodyStyle: oneOf(car.bodyStyle, BODY_STYLES, 'sedan'),
          fuelType: oneOf(car.fuelType, FUEL_TYPES, 'petrol'),
          transmission: oneOf(car.transmission, TRANSMISSIONS, 'automatic'),
          drivetrain: oneOf(car.drivetrain, DRIVETRAINS, 'fwd'),
          engine: str(car.engine) || undefined,
          horsepower: num(car.horsepower),
          mileage: num(car.mileage),
          exteriorColor: str(car.exteriorColor) || undefined,
          interiorColor: str(car.interiorColor) || undefined,
          seats: num(car.seats),
          doors: num(car.doors),
          vin: str(car.vin) || undefined,
          features: strList(car.features),
        }),
      },
    };
  }

  const part = (body.part ?? {}) as Record<string, unknown>;
  const partNumber = str(part.partNumber);
  if (!partNumber) return { error: 'Part number is required' };

  return {
    data: {
      ...base,
      part: compact({
        partNumber,
        brand: str(part.brand),
        category: oneOf(part.category, PART_CATEGORIES, 'accessories'),
        condition: oneOf(part.condition, PART_CONDITIONS, 'new'),
        oem: part.oem === true,
        compatibleMakes: strList(part.compatibleMakes),
        compatibleModels: strList(part.compatibleModels),
        yearFrom: num(part.yearFrom),
        yearTo: num(part.yearTo),
        warrantyMonths: num(part.warrantyMonths),
        weightKg: num(part.weightKg),
      }),
    },
  };
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
  console.error('[api/products]', err);
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Public — the storefront reads this too, so unpublished items are hidden unless an admin asks. */
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type');
    const includeUnpublished = req.nextUrl.searchParams.get('includeUnpublished') === 'true';

    let query: admin.firestore.Query = adminDb.collection(PRODUCTS_COLLECTION);
    if (type === 'car' || type === 'part') {
      query = query.where('type', '==', type);
    }

    if (includeUnpublished) {
      const guard = await requireAdmin(req);
      if ('response' in guard) return guard.response;
    } else {
      query = query.where('published', '==', true);
    }

    const snapshot = await query.get();
    const products = snapshot.docs.map(serialize);
    // Sorted in memory so Firestore doesn't demand a composite index for every filter combination.
    products.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));

    return NextResponse.json(products);
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

    const built = buildProduct(body);
    if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });

    const docRef = await adminDb.collection(PRODUCTS_COLLECTION).add({
      ...built.data,
      createdBy: guard.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const created = await docRef.get();
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requireAdmin(req);
    if ('response' in guard) return guard.response;

    const body = await readJson(req);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const id = str(body.id);
    if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 });

    const built = buildProduct(body);
    if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });

    const docRef = adminDb.collection(PRODUCTS_COLLECTION).doc(id);
    const existing = await docRef.get();
    if (!existing.exists) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Switching type must clear the old spec block, otherwise a car→part edit leaves a stale `car` field.
    const clearOtherSpec =
      built.data.type === 'car'
        ? { part: admin.firestore.FieldValue.delete() }
        : { car: admin.firestore.FieldValue.delete() };

    await docRef.update({
      ...built.data,
      ...clearOtherSpec,
      updatedBy: guard.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await docRef.get();
    return NextResponse.json(serialize(updated));
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
    const id = str(idFromQuery ?? body?.id);
    if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 });

    const docRef = adminDb.collection(PRODUCTS_COLLECTION).doc(id);
    if (!(await docRef.get()).exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return serverError(err);
  }
}
