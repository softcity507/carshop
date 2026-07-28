/**
 * A small read-through cache for the API services.
 *
 * It solves two separate kinds of waste:
 *
 *  - **Repeats.** The same data is asked for by several screens (settings by the checkout form,
 *    the dashboard and the settings page; products by the catalog and the featured strip) and
 *    again every time you navigate back. Within the TTL those all reuse one answer.
 *  - **Stampedes.** Two components mounting in the same tick both ask before either has finished.
 *    The second one joins the request already in flight instead of opening a second one.
 *
 * Writes call {@link invalidate} so the next read goes back to the server. Failures are never
 * cached — an error leaves nothing behind and the next attempt tries again.
 */

interface Entry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();

/** How long each kind of data stays fresh. Short enough that an admin edit shows up promptly. */
export const TTL = {
  /** Things that change as you work: orders, messages, the activity log. */
  volatile: 15_000,
  /** Things that change occasionally: products, users. */
  steady: 45_000,
  /** Things that change rarely: store settings. */
  stable: 120_000,
} as const;

export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  force = false
): Promise<T> {
  // On the server a module-level Map would be shared between users, so never cache there.
  if (typeof window === 'undefined') return load();

  if (force) {
    cache.delete(key);
  } else {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  }

  const pending = inFlight.get(key);
  if (pending && !force) return pending as Promise<T>;

  const request = load()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

/** Drops every entry whose key starts with `prefix` — call after any write that changes it. */
export function invalidate(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** Called on sign-in and sign-out: the next account must not read the previous one's data. */
export function invalidateAll() {
  cache.clear();
  inFlight.clear();
}
