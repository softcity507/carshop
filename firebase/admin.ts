import fs from 'node:fs';
import path from 'node:path';
import * as admin from 'firebase-admin';

export const ADMIN_SETUP_MESSAGE =
  'Firebase Admin is not configured. Either drop your service-account JSON at the project root as ' +
  'serviceAccountKey.json, or set FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / ' +
  'FIREBASE_ADMIN_PRIVATE_KEY in .env.local (Firebase Console → Project settings → Service accounts → ' +
  'Generate new private key). Restart the dev server afterwards.';

type ServiceAccount = { projectId: string; clientEmail: string; privateKey: string };

/** Credential source 1: individual env vars. */
function fromEnv(): ServiceAccount | null {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!clientEmail || !privateKey || !projectId) return null;

  return {
    projectId: projectId.trim(),
    clientEmail: clientEmail.trim(),
    // Private key is usually newline-escaped when it comes from an env var.
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

/**
 * Credential source 2: the JSON file Firebase Console hands you. Reading it here rather than
 * `require`-ing it keeps a missing file from becoming a build-time module resolution error.
 */
function fromKeyFile(): ServiceAccount | null {
  const candidates = [
    process.env.FIREBASE_ADMIN_KEY_FILE,
    'serviceAccountKey.json',
    'firebase-service-account.json',
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const filePath = path.isAbsolute(candidate) ? candidate : path.join(process.cwd(), candidate);
    if (!fs.existsSync(filePath)) continue;

    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
        };
      }
      console.warn(`[firebase/admin] ${candidate} is missing project_id, client_email or private_key.`);
    } catch (err) {
      console.warn(`[firebase/admin] Could not parse ${candidate}:`, err);
    }
  }

  return null;
}

function getServiceAccount(): ServiceAccount | null {
  return fromEnv() ?? fromKeyFile();
}

function hasHostedCredentials() {
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE || process.env.FUNCTION_TARGET
  );
}

export function isAdminConfigured() {
  return Boolean(getServiceAccount()) || hasHostedCredentials();
}

/**
 * Optional fields are modelled as `field?: string` all over this codebase, so an absent one
 * naturally arrives as `undefined` — which Firestore rejects outright rather than skipping.
 * Telling it to drop those keys turns "an optional value was omitted" back into what it should
 * be: a field that simply isn't written.
 *
 * `settings()` may only be called once, and only before the first read or write, so it happens
 * here on the one path that creates the app.
 */
function configure(app: admin.app.App): admin.app.App {
  app.firestore().settings({ ignoreUndefinedProperties: true });
  return app;
}

function getApp(): admin.app.App {
  // `admin.apps` is undefined under some import interop paths, so guard rather than assume an array.
  if (admin.apps?.length) return admin.app();

  const serviceAccount = getServiceAccount();

  if (serviceAccount) {
    const clientProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
    if (clientProjectId && clientProjectId !== serviceAccount.projectId) {
      // Verifying a token minted by project A against project B always fails on audience mismatch.
      throw new Error(
        `Firebase project mismatch: the browser signs in to "${clientProjectId}" but the service account ` +
          `belongs to "${serviceAccount.projectId}". Use a key from the same project.`
      );
    }

    return configure(
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: serviceAccount.projectId,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim() || undefined,
      })
    );
  }

  // Hosted environments (Cloud Run / Cloud Functions) supply Application Default Credentials.
  if (hasHostedCredentials()) {
    return configure(
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    );
  }

  // Otherwise every Admin call spends ~6s failing an ADC lookup. Fail fast with something actionable.
  throw new Error(ADMIN_SETUP_MESSAGE);
}

/**
 * Initialisation is deferred to first property access: throwing at import time would break
 * `next build`, which evaluates route modules during its static analysis pass.
 */
function lazyAdmin<T extends object>(resolve: (app: admin.app.App) => T): T {
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      const service = resolve(getApp());
      const value = Reflect.get(service as object, prop, receiver);
      return typeof value === 'function' ? value.bind(service) : value;
    },
  });
}

export const adminAuth = lazyAdmin((app) => app.auth());
export const adminDb = lazyAdmin((app) => app.firestore());
