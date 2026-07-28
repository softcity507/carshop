import * as admin from 'firebase-admin';
import { adminDb } from '@/firebase/admin';

/**
 * The whole admin configuration lives under one root: `settings/store` holds the settings
 * document, and its `notes` subcollection holds the activity log.
 */
export const SETTINGS_COLLECTION = 'settings';
export const SETTINGS_DOC = 'store';
export const NOTES_SUBCOLLECTION = 'notes';

export const settingsRef = () => adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC);

export const notesRef = () => settingsRef().collection(NOTES_SUBCOLLECTION);

/**
 * Records something an admin just did, into the same log their hand-written notes go to. The
 * write is fire-and-forget on purpose: a failed log entry must never turn a successful order
 * edit into an error the admin sees.
 */
export function logActivity(actorUid: string, actorName: string, title: string, body = '') {
  const now = new Date();
  // `YYYY-MM-DD` in the server's timezone — the same shape the manual notes use.
  const date = now.toISOString().slice(0, 10);

  notesRef()
    .add({
      kind: 'activity',
      title,
      body,
      date,
      authorUid: actorUid,
      authorName: actorName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    .catch((err) => console.error('[settings] could not record activity', err));
}
