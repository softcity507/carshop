"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserService } from '@/services/user.service';

interface CarUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: string;
  createdAt?: { _seconds?: number; toDate?: () => Date } | string | null;
  lastLogin?: { _seconds?: number; toDate?: () => Date } | string | null;
}

/**
 * Firestore Timestamps arrive over JSON as `{_seconds,_nanoseconds}` — `toDate()` does not survive
 * serialisation, so handle the raw shape too rather than silently rendering "N/A".
 */
function formatTimestamp(value: CarUser['createdAt']) {
  if (!value) return 'Never';
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') return value.toDate().toLocaleString();
    if (typeof value._seconds === 'number') return new Date(value._seconds * 1000).toLocaleString();
  }
  return 'Never';
}

export function UserList() {
  const [users, setUsers] = useState<CarUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const { user: currentUser, isAuthReady } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!isAuthReady || !isAdmin) return;

    let active = true;

    (async () => {
      try {
        const loadedUsers = await UserService.getUsers<CarUser>();
        if (!active) return;
        // Admins first, then alphabetically so the order is stable between loads.
        setUsers(
          [...loadedUsers].sort((a, b) => {
            if (a.role !== b.role) return a.role === 'admin' ? -1 : b.role === 'admin' ? 1 : 0;
            return (a.email ?? '').localeCompare(b.email ?? '');
          })
        );
        setLoadError(null);
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Unable to load users.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthReady, isAdmin]);

  async function handleDeleteUser(targetUser: CarUser) {
    if (targetUser.uid === currentUser?.uid) {
      setActionError('You cannot delete your own account.');
      return;
    }

    const name = targetUser.displayName ?? targetUser.email ?? 'this user';
    if (!window.confirm(`Delete ${name}? This permanently removes the account and its profile.`)) return;

    setDeletingUid(targetUser.uid);
    setActionError(null);

    try {
      await UserService.deleteUser(targetUser.uid);
      setUsers((current) => current.filter((user) => user.uid !== targetUser.uid));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete this user.');
    } finally {
      setDeletingUid(null);
    }
  }

  if (isAuthReady && !isAdmin) {
    return <div className="card px-6 py-12 text-center text-sm text-muted">You need an admin account to manage users.</div>;
  }

  return (
    <div className="card p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-heading">Registered Users</h2>
          <p className="mt-1 text-sm text-muted">All accounts with their current role.</p>
        </div>
        <span className="rounded-lg border border-line bg-chip px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">
          {loading ? 'Loading…' : `${users.length} user${users.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Action errors sit above the table so a failed delete never hides the list. */}
      {actionError && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-brand">{actionError}</p>
      )}

      {loadError ? (
        <p className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-6 text-sm text-brand">{loadError}</p>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((slot) => (
            <div key={slot} className="h-14 animate-pulse rounded-lg bg-skeleton" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-chip">
              <tr>
                {['Name', 'Email', 'Role', 'Last Login'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">
                    {heading}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((listedUser) => (
                <tr key={listedUser.uid} className="transition hover:bg-chip/60">
                  <td className="px-4 py-4 font-semibold text-heading">{listedUser.displayName ?? 'Unknown'}</td>
                  <td className="px-4 py-4 text-muted">{listedUser.email ?? 'No email'}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.06em] ${
                        listedUser.role === 'admin' ? 'bg-brand text-white' : 'bg-chip text-muted'
                      }`}
                    >
                      {listedUser.role ?? 'user'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted">{formatTimestamp(listedUser.lastLogin)}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(listedUser)}
                      disabled={deletingUid === listedUser.uid || listedUser.uid === currentUser?.uid}
                      title={listedUser.uid === currentUser?.uid ? 'You cannot delete your own account' : undefined}
                      className="rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand transition hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deletingUid === listedUser.uid ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
