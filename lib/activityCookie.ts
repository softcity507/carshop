import type { ActivityNote } from '@/types/settings';

export const RECENT_ACTIVITY_COOKIE = 'carhub_recent_activity';

/** How many entries the profile shows, and the most the cookie will ever hold. */
export const RECENT_ACTIVITY_LIMIT = 10;

/**
 * Cookies are capped at roughly 4KB per name and are sent on every single request to the site,
 * so this stays well under that. Firestore holds the full log; this is only a cache so the
 * profile can paint its recent list before the network answers.
 */
const MAX_COOKIE_BYTES = 3_000;

/** Titles are trimmed hard — the full text is always available from the database. */
const MAX_TITLE = 70;

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Short keys keep the encoded cookie small. */
interface PackedEntry {
  i: string;
  k: 'note' | 'activity';
  t: string;
  d: string;
  c: string | null;
}

export interface RecentActivity {
  id: string;
  kind: 'note' | 'activity';
  title: string;
  date: string;
  createdAt: string | null;
}

function pack(note: ActivityNote): PackedEntry {
  return {
    i: note.id,
    k: note.kind,
    t: (note.title || (note.kind === 'activity' ? 'Activity' : 'Note')).slice(0, MAX_TITLE),
    d: note.date,
    c: note.createdAt,
  };
}

function unpack(entry: PackedEntry): RecentActivity {
  return { id: entry.i, kind: entry.k, title: entry.t, date: entry.d, createdAt: entry.c ?? null };
}

function readRawCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  for (const part of document.cookie.split('; ')) {
    const separator = part.indexOf('=');
    if (separator > 0 && part.slice(0, separator) === name) return part.slice(separator + 1);
  }

  return null;
}

/** Returns an empty list rather than throwing — a stale or hand-edited cookie is not an error. */
function parse(raw: string | null): RecentActivity[] {
  if (!raw) return EMPTY;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter((entry): entry is PackedEntry => Boolean(entry) && typeof entry.i === 'string')
      .slice(0, RECENT_ACTIVITY_LIMIT)
      .map(unpack);
  } catch {
    return EMPTY;
  }
}

export function readRecentActivity(): RecentActivity[] {
  return parse(readRawCookie(RECENT_ACTIVITY_COOKIE));
}

/*
 * A `useSyncExternalStore` source, the same shape the cart uses for localStorage. The snapshot is
 * memoised against the raw cookie string because React compares snapshots by reference — parsing
 * afresh on every call would hand back a new array each time and loop forever.
 */

const EMPTY: RecentActivity[] = [];

let cachedRaw: string | null | undefined;
let cachedList: RecentActivity[] = EMPTY;

const listeners = new Set<() => void>();

export function subscribeRecentActivity(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRecentActivitySnapshot(): RecentActivity[] {
  const raw = readRawCookie(RECENT_ACTIVITY_COOKIE);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parse(raw);
  }
  return cachedList;
}

/** The server has no cookie, so it renders the empty list and the client swaps in after mount. */
export function getRecentActivityServerSnapshot(): RecentActivity[] {
  return EMPTY;
}

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Mirrors the newest entries into the cookie, dropping the oldest until the encoded value fits.
 * Not `HttpOnly` by design — the profile reads it from the browser — so nothing but titles and
 * timestamps goes in it.
 */
export function writeRecentActivity(notes: ActivityNote[]) {
  if (typeof document === 'undefined') return;

  let packed = notes.slice(0, RECENT_ACTIVITY_LIMIT).map(pack);
  let encoded = encodeURIComponent(JSON.stringify(packed));

  while (packed.length > 0 && encoded.length > MAX_COOKIE_BYTES) {
    packed = packed.slice(0, -1);
    encoded = encodeURIComponent(JSON.stringify(packed));
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${RECENT_ACTIVITY_COOKIE}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  notify();
}

/** Called on sign-out so one admin's trail isn't left behind for the next person on the machine. */
export function clearRecentActivity() {
  if (typeof document === 'undefined') return;
  document.cookie = `${RECENT_ACTIVITY_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  notify();
}
