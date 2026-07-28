"use client";

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { FiActivity, FiClock, FiExternalLink } from 'react-icons/fi';
import {
  RECENT_ACTIVITY_LIMIT,
  getRecentActivityServerSnapshot,
  getRecentActivitySnapshot,
  subscribeRecentActivity,
  writeRecentActivity,
  type RecentActivity as Entry,
} from '@/lib/activityCookie';
import { SettingsService } from '@/services/settings.service';

/** Midnight at the start of the day `value` falls in — the boundary relative time stops at. */
function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

/**
 * Counts in minutes and hours only while the entry is still part of today. Once the clock rolls
 * past midnight into the next morning it becomes "Yesterday" and then a plain date — "14h ago"
 * for something logged the previous evening reads as though it were still the same working day.
 */
function formatWhen(entry: Entry) {
  const stamp = entry.createdAt ? new Date(entry.createdAt) : new Date(`${entry.date}T00:00:00`);
  if (Number.isNaN(stamp.getTime())) return entry.date;

  const now = new Date();
  const time = stamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const daysApart = Math.round((startOfDay(now) - startOfDay(stamp)) / 86_400_000);

  if (daysApart === 0) {
    const minutes = Math.floor((now.getTime() - stamp.getTime()) / 60_000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  if (daysApart === 1) return `Yesterday ${time}`;
  if (daysApart < 7) return `${stamp.toLocaleDateString([], { weekday: 'long' })} ${time}`;

  return stamp.toLocaleDateString();
}

export function RecentActivity() {
  // The cookie is read straight away, so the list paints before any request goes out. The server
  // renders the empty snapshot and the client swaps in after mount — React handles the tearing.
  const entries = useSyncExternalStore(
    subscribeRecentActivity,
    getRecentActivitySnapshot,
    getRecentActivityServerSnapshot
  );

  const [settled, setSettled] = useState(false);
  const [stale, setStale] = useState(false);

  // Then confirm against the database, which is the actual record. Rewriting the cookie notifies
  // the store above, so the list refreshes itself.
  useEffect(() => {
    let active = true;

    SettingsService.getNotes()
      .then((notes) => {
        if (!active) return;
        writeRecentActivity(notes);
        setSettled(true);
      })
      // Falling back to the cookie is the whole point of caching it — just flag that it may lag.
      .catch(() => {
        if (!active) return;
        setStale(true);
        setSettled(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg bg-chip p-2 text-heading">
            <FiActivity size={16} />
          </span>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-heading">Recent activity</h2>
            <p className="mt-1 text-xs text-muted">
              Your last {RECENT_ACTIVITY_LIMIT} entries, cached in this browser for a quick look.
            </p>
          </div>
        </div>

        <Link href="/settings" className="btn-ghost">
          <FiExternalLink size={13} /> Full log
        </Link>
      </div>

      {stale && entries.length > 0 && (
        <p className="mt-5 rounded-lg border border-line bg-chip/50 px-4 py-2.5 text-xs text-muted">
          Showing the cached copy — the log could not be reached just now.
        </p>
      )}

      {/* Only a genuinely empty cookie *and* an unfinished request counts as loading. */}
      {entries.length === 0 && !settled ? (
        <div className="mt-5 space-y-2">
          {[0, 1, 2].map((slot) => (
            <div key={slot} className="h-12 animate-pulse rounded-lg bg-skeleton" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-line px-6 py-12 text-center">
          <FiClock size={28} className="mx-auto text-faint" />
          <p className="mt-4 text-sm font-semibold text-heading">Nothing recorded yet</p>
          <p className="mt-1.5 text-xs text-muted">
            Edit an order or write a note and it will appear here.
          </p>
        </div>
      ) : (
        <ol className="mt-5 divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 py-3">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  entry.kind === 'activity' ? 'bg-line' : 'bg-brand'
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-heading">{entry.title}</span>
                <span className="mt-0.5 block text-[11px] text-faint">
                  {entry.kind === 'activity' ? 'Auto-recorded' : 'Written note'} · {formatWhen(entry)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
