"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserService } from '@/services/user.service';

interface CarUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: string;
  createdAt?: { toDate?: () => Date } | string | null;
  lastLogin?: { toDate?: () => Date } | string | null;
}

function formatTimestamp(value: CarUser['createdAt'] | CarUser['lastLogin']) {
  if (!value) return 'N/A';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value?.toDate) {
    return value.toDate().toLocaleString();
  }
  return 'N/A';
}

export function UserList() {
  const [users, setUsers] = useState<CarUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const { user: currentUser, isAuthReady } = useAuth();

  useEffect(() => {
    async function loadUsers() {
      try {
        const loadedUsers = await UserService.getUsers<CarUser>();

        setUsers(
          loadedUsers.sort((a, b) => {
            if (a.role === b.role) return 0;
            if (a.role === 'admin') return -1;
            if (b.role === 'admin') return 1;
            return 0;
          })
        );
      } catch (err) {
        console.error('Failed to load users', err);
        setError(err instanceof Error ? err.message : 'Unable to load users. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }
    
    if (!isAuthReady) {
      return;
    }

    if (currentUser?.role === 'admin') {
      loadUsers();
    }
  }, [currentUser?.role, isAuthReady]);

  async function handleDeleteUser(targetUser: CarUser) {
    if (targetUser.uid === currentUser?.uid) {
      setError('You cannot delete your own account.');
      return;
    }

    const name = targetUser.displayName ?? targetUser.email ?? 'this user';
    if (!window.confirm(`Delete ${name}? This permanently removes the account and its user profile.`)) {
      return;
    }

    setDeletingUid(targetUser.uid);
    setError(null);

    try {
      await UserService.deleteUser(targetUser.uid);
      setUsers((currentUsers) => currentUsers.filter((user) => user.uid !== targetUser.uid));
    } catch (err) {
      console.error('Failed to delete user', err);
      setError('Unable to delete this user. Please try again.');
    } finally {
      setDeletingUid(null);
    }
  }

  return (
    <div className="rounded-3xl bg-slate-900/95 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Registered Users</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            All users fetched from Firestore with role information.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm text-slate-300 ring-1 ring-white/10">
          {loading ? 'Loading users…' : `${users.length} users found`}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-200">
            <thead className="bg-slate-900/90 text-slate-300">
              <tr>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Email</th>
                <th className="px-4 py-4">Role</th>
                <th className="px-4 py-4">Last Login</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((listedUser) => (
                <tr key={listedUser.uid} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-4 font-medium text-white">{listedUser.displayName ?? 'Unknown'}</td>
                  <td className="px-4 py-4 text-slate-300">{listedUser.email ?? 'No email'}</td>
                  <td className={`px-4 py-4 font-semibold ${listedUser.role === 'admin' ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {listedUser.role ?? 'user'}
                  </td>
                  <td className="px-4 py-4 text-slate-400">{formatTimestamp(listedUser.lastLogin)}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(listedUser)}
                      disabled={deletingUid === listedUser.uid || listedUser.uid === currentUser?.uid}
                      className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 ring-1 ring-inset ring-rose-500/30 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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
