import * as admin from 'firebase-admin';

function getServiceAccount() {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (clientEmail && privateKey && projectId) {
    // Private key may be newline-escaped in env
    const key = privateKey.replace(/\\n/g, '\n');
    return {
      projectId,
      clientEmail,
      privateKey: key,
    };
  }

  return null;
}

if (!admin.apps.length) {
  const serviceAccount = getServiceAccount();

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.projectId,
    });
  } else {
    // Fallback: initialize with projectId only (may use ADC in hosted environments).
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
