import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/firebase/admin';

const USERS_COLLECTION = 'carUser';

async function authorize(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

async function isAdmin(uid: string) {
  const userRef = adminDb.collection(USERS_COLLECTION).doc(uid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) return false;
  const data = snapshot.data();
  return data?.role === 'admin';
}

export async function GET(req: NextRequest) {
  const uid = await authorize(req);
  if (!uid || !(await isAdmin(uid))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snapshot = await adminDb.collection(USERS_COLLECTION).get();
  const users = snapshot.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }));
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const uid = await authorize(req);
  if (!uid || !(await isAdmin(uid))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, password, role = 'user' } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const userRecord = await adminAuth.createUser({
    displayName: name,
    email,
    password,
  });

  const userRef = adminDb.collection(USERS_COLLECTION).doc(userRecord.uid);
  await userRef.set({
    email,
    displayName: name,
    role,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true, uid: userRecord.uid });
}

export async function PUT(req: NextRequest) {
  const uid = await authorize(req);
  if (!uid || !(await isAdmin(uid))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { uid: targetUid, displayName, email, role } = body;

  if (!targetUid) {
    return NextResponse.json({ error: 'Missing user uid' }, { status: 400 });
  }

  const userRef = adminDb.collection(USERS_COLLECTION).doc(targetUid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (displayName !== undefined) updateData.displayName = displayName;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;

  if (Object.keys(updateData).length > 0) {
    await userRef.update(updateData);
  }

  if (displayName !== undefined || email !== undefined) {
    await adminAuth.updateUser(targetUid, {
      displayName: displayName ?? undefined,
      email: email ?? undefined,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const uid = await authorize(req);
  if (!uid || !(await isAdmin(uid))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { uid: targetUid } = body;
  if (!targetUid) {
    return NextResponse.json({ error: 'Missing user uid' }, { status: 400 });
  }

  if (targetUid === uid) {
    return NextResponse.json({ error: 'Administrators cannot delete their own account' }, { status: 400 });
  }

  await adminAuth.deleteUser(targetUid);
  await adminDb.collection(USERS_COLLECTION).doc(targetUid).delete();

  return NextResponse.json({ success: true });
}
