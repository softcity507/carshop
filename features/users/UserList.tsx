"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

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

  const {user} = useAuth();

  useEffect(() => {
    async function loadUsers() {
      try {
        const snapshot = await getDocs(collection(db, 'carUser'));
        const loadedUsers: CarUser[] = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        } as CarUser));

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
        setError('Unable to load users. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }
    
    user?.role==='admin' &&
    loadUsers();
  }, []);

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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-4 font-medium text-white">{user.displayName ?? 'Unknown'}</td>
                  <td className="px-4 py-4 text-slate-300">{user.email ?? 'No email'}</td>
                  <td className={`px-4 py-4 font-semibold ${user.role === 'admin' ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {user.role ?? 'user'}
                  </td>
                   <td className="px-4 py-4 text-slate-400">{formatTimestamp(user.lastLogin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
