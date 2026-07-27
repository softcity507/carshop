"use client";

import { useEffect, useMemo, useState } from 'react';
import { FiArchive, FiCheck, FiCornerUpLeft, FiInbox, FiRefreshCw, FiTrash2, FiUser } from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { ContactService } from '@/services/contact.service';
import { CONTACT_STATUSES, type ContactMessage, type ContactStatus } from '@/types/contact';

type StatusFilter = 'all' | ContactStatus;

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_STYLE: Record<ContactStatus, string> = {
  new: 'bg-brand text-white',
  read: 'bg-success-soft text-success',
  archived: 'bg-chip text-muted',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

/** "3 hours ago" style stamp for the list; the detail panel shows the exact time. */
function formatRelative(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return value;

  const minutes = Math.round((Date.now() - parsed) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))}d ago`;
  return new Date(parsed).toLocaleDateString();
}

export function ContactMessages() {
  const { user, isAuthReady } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !isAdmin) return;

    let active = true;

    (async () => {
      try {
        const loaded = await ContactService.getMessages();
        if (!active) return;
        setMessages(loaded);
        setLoadError(null);
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Unable to load messages.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthReady, isAdmin]);

  const visible = useMemo(
    () => (filter === 'all' ? messages : messages.filter((message) => message.status === filter)),
    [messages, filter]
  );

  const counts = useMemo(() => {
    const tally: Record<ContactStatus, number> = { new: 0, read: 0, archived: 0 };
    messages.forEach((message) => {
      if (CONTACT_STATUSES.includes(message.status)) tally[message.status] += 1;
    });
    return tally;
  }, [messages]);

  // The selection is kept by id so it survives a refresh, and falls back to the first visible row.
  const selected = visible.find((message) => message.id === selectedId) ?? visible[0] ?? null;

  async function handleRefresh() {
    setRefreshing(true);
    setActionError(null);
    try {
      setMessages(await ContactService.getMessages());
      setLoadError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to refresh messages.');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleStatus(message: ContactMessage, status: ContactStatus) {
    setBusyId(message.id);
    setActionError(null);
    try {
      await ContactService.updateStatus(message.id, status);
      setMessages((current) => current.map((entry) => (entry.id === message.id ? { ...entry, status } : entry)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update this message.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(message: ContactMessage) {
    if (!window.confirm(`Delete the message from ${message.name}? This cannot be undone.`)) return;

    setBusyId(message.id);
    setActionError(null);
    try {
      await ContactService.deleteMessage(message.id);
      setMessages((current) => current.filter((entry) => entry.id !== message.id));
      if (selectedId === message.id) setSelectedId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete this message.');
    } finally {
      setBusyId(null);
    }
  }

  if (isAuthReady && !isAdmin) {
    return <div className="card px-6 py-12 text-center text-sm text-muted">You need an admin account to read enquiries.</div>;
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((slot) => (
          <div key={slot} className="h-24 animate-pulse rounded-xl bg-skeleton" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return <p className="rounded-xl border border-brand/30 bg-brand/5 px-6 py-6 text-sm text-brand">{loadError}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${
                filter === option.value ? 'bg-brand text-white' : 'border border-line bg-panel text-muted hover:bg-chip'
              }`}
            >
              {option.label}
              <span className="ml-2 opacity-70">
                {option.value === 'all' ? messages.length : counts[option.value]}
              </span>
            </button>
          ))}
        </div>

        <button type="button" onClick={handleRefresh} disabled={refreshing} className="btn-ghost">
          <FiRefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {actionError && (
        <p className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-brand">{actionError}</p>
      )}

      {visible.length === 0 ? (
        <div className="card px-6 py-20 text-center">
          <FiInbox size={40} className="mx-auto text-faint" />
          <p className="mt-6 text-lg font-semibold text-heading">No messages here</p>
          <p className="mt-2 text-sm text-muted">
            {filter === 'all' ? 'Enquiries from the contact page will land in this inbox.' : 'Nothing with this status.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[24rem_1fr] lg:items-start">
          {/* List */}
          <div className="card divide-y divide-line overflow-hidden">
            {visible.map((message) => {
              const active = selected?.id === message.id;
              return (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => setSelectedId(message.id)}
                  className={`block w-full px-5 py-4 text-left transition ${active ? 'bg-chip' : 'hover:bg-chip/60'}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-bold text-heading">{message.name}</span>
                    <span className="shrink-0 text-[11px] font-semibold text-faint">
                      {formatRelative(message.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">{message.subject || 'No subject'}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{message.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                        STATUS_STYLE[message.status] ?? STATUS_STYLE.read
                      }`}
                    >
                      {message.status}
                    </span>
                    {message.sender && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                        <FiUser size={10} /> {message.sender.role ?? 'user'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          {selected && <MessageDetail
            message={selected}
            busy={busyId === selected.id}
            onStatus={handleStatus}
            onDelete={handleDelete}
          />}
        </div>
      )}
    </div>
  );
}

function MessageDetail({
  message,
  busy,
  onStatus,
  onDelete,
}: {
  message: ContactMessage;
  busy: boolean;
  onStatus: (message: ContactMessage, status: ContactStatus) => void;
  onDelete: (message: ContactMessage) => void;
}) {
  const replySubject = encodeURIComponent(message.subject ? `Re: ${message.subject}` : 'Re: your CarHub enquiry');

  return (
    <article className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-heading">
            {message.subject || 'No subject'}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {message.name} ·{' '}
            <a href={`mailto:${message.email}`} className="font-semibold text-brand hover:underline">
              {message.email}
            </a>
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${
            STATUS_STYLE[message.status] ?? STATUS_STYLE.read
          }`}
        >
          {message.status}
        </span>
      </div>

      <p className="mt-6 whitespace-pre-line rounded-lg border border-line bg-chip/50 p-5 text-sm leading-7 text-ink">
        {message.description}
      </p>

      <DetailBlock
        title="Submitted details"
        rows={[
          ['Name', message.name],
          ['Email', message.email],
          ['Phone', message.phone || '—'],
          ['Subject', message.subject || '—'],
          ['Received', formatDateTime(message.createdAt)],
          ['Message id', message.id],
        ]}
      />

      {/* Everything below comes from the sender's account, resolved live on each load. */}
      {message.sender ? (
        <DetailBlock
          title="Login details"
          rows={[
            ['Account name', message.sender.displayName ?? '—'],
            ['Account email', message.sender.accountEmail ?? '—'],
            ['Role', message.sender.role ?? 'user'],
            ['User id', message.sender.uid],
            ['Sign-in methods', message.sender.providers.length ? message.sender.providers.join(', ') : '—'],
            ['Email verified', message.sender.emailVerified ? 'Yes' : 'No'],
            ['Account status', message.sender.disabled ? 'Disabled or deleted' : 'Active'],
            ['Account created', formatDateTime(message.sender.accountCreatedAt)],
            ['Last sign-in', formatDateTime(message.sender.lastSignInAt)],
            ['Last login (app)', formatDateTime(message.sender.lastLoginAt)],
            [
              'Email match',
              message.sender.accountEmail?.toLowerCase() === message.email.toLowerCase()
                ? 'Matches the form'
                : 'Different from the form address',
            ],
          ]}
        />
      ) : (
        <DetailBlock
          title="Login details"
          rows={[['Signed in', 'No — sent by a visitor who was not logged in']]}
        />
      )}

      {message.userAgent && (
        <p className="mt-4 break-words text-[11px] leading-5 text-faint">Device: {message.userAgent}</p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <a href={`mailto:${message.email}?subject=${replySubject}`} className="btn-primary">
          <FiCornerUpLeft size={14} /> Reply by email
        </a>

        {message.status !== 'read' && (
          <button type="button" onClick={() => onStatus(message, 'read')} disabled={busy} className="btn-ghost">
            <FiCheck size={14} /> Mark as read
          </button>
        )}
        {message.status !== 'new' && (
          <button type="button" onClick={() => onStatus(message, 'new')} disabled={busy} className="btn-ghost">
            <FiInbox size={14} /> Mark as new
          </button>
        )}
        {message.status !== 'archived' && (
          <button type="button" onClick={() => onStatus(message, 'archived')} disabled={busy} className="btn-ghost">
            <FiArchive size={14} /> Archive
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(message)}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand/40 bg-brand/5 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-brand transition hover:bg-brand/10 disabled:opacity-40"
        >
          <FiTrash2 size={14} /> Delete
        </button>
      </div>
    </article>
  );
}

function DetailBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section className="mt-8">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{title}</h3>
      <dl className="mt-3 overflow-hidden rounded-lg border border-line">
        {rows.map(([label, value], index) => (
          <div
            key={label}
            className={`flex flex-wrap justify-between gap-4 px-4 py-3 ${index % 2 === 0 ? 'bg-panel' : 'bg-chip/50'}`}
          >
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-muted">{label}</dt>
            <dd className="min-w-0 break-words text-right text-sm font-semibold text-heading">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
