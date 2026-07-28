"use client";

import { FiMail, FiShield, FiUser } from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';

export function AdminProfile() {
  const { user, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return <div className="card h-64 animate-pulse bg-skeleton" />;
  }

  if (!user) {
    return (
      <div className="card px-6 py-12 text-center text-sm text-muted">
        Sign in to see your profile.
      </div>
    );
  }

  const initials = (user.displayName || user.email || 'A')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <section className="card p-6">
      <div className="flex items-center gap-4 border-b border-line pb-6">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy text-xl font-extrabold text-white">
          {initials}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold uppercase tracking-tight text-heading">
            {user.displayName || 'Admin'}
          </h2>
          <p className="mt-1 truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <dl className="mt-6 space-y-4">
        <Row icon={<FiUser size={14} />} label="Display name" value={user.displayName || '—'} />
        <Row icon={<FiMail size={14} />} label="Email" value={user.email || '—'} />
        <Row icon={<FiShield size={14} />} label="Role" value={user.role ?? 'user'} />
      </dl>

      <p className="mt-6 break-words text-[11px] text-faint">Account id: {user.uid}</p>
    </section>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-faint">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-bold uppercase tracking-[0.06em] text-muted">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-heading">{value}</dd>
      </div>
    </div>
  );
}
