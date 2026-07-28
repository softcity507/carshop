"use client";

import { useEffect, useMemo, useState } from 'react';
import { FiActivity, FiAlertTriangle, FiCalendar, FiEdit3, FiPlus, FiRefreshCw, FiTrash2, FiX } from 'react-icons/fi';
import { writeRecentActivity } from '@/lib/activityCookie';
import { SettingsService } from '@/services/settings.service';
import { NOTE_LIMITS, validateNote, type ActivityNote } from '@/types/settings';

type KindFilter = 'all' | 'note' | 'activity';

const FILTERS: Array<{ value: KindFilter; label: string }> = [
  { value: 'all', label: 'Everything' },
  { value: 'note', label: 'My notes' },
  { value: 'activity', label: 'Auto-recorded' },
];

/** `YYYY-MM-DD` for today in the browser's timezone — `toISOString` would shift across midnight. */
function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatDay(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  const label = parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (date === today()) return `Today · ${label}`;
  return label;
}

function formatTime(value: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ActivityLog() {
  const [notes, setNotes] = useState<ActivityNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<KindFilter>('all');

  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ title: '', body: '', date: today() });
  const [draftErrors, setDraftErrors] = useState<{ title?: string; body?: string; date?: string }>({});
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * Firestore is the record; the cookie is a small mirror of the newest entries so the admin
   * profile can show them without waiting on a request. Both are updated together.
   */
  function applyNotes(next: ActivityNote[]) {
    setNotes(next);
    writeRecentActivity(next);
  }

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const loaded = await SettingsService.getNotes();
        if (!active) return;
        setNotes(loaded);
        writeRecentActivity(loaded);
        setError(null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load the log.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? notes : notes.filter((note) => note.kind === filter)),
    [notes, filter]
  );

  /** The log reads as a diary, so entries are bucketed under the day they belong to. */
  const days = useMemo(() => {
    const grouped = new Map<string, ActivityNote[]>();
    visible.forEach((note) => {
      const bucket = grouped.get(note.date);
      if (bucket) bucket.push(note);
      else grouped.set(note.date, [note]);
    });
    return Array.from(grouped.entries());
  }, [visible]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      applyNotes(await SettingsService.getNotes());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh the log.');
    } finally {
      setRefreshing(false);
    }
  }

  async function saveNote() {
    const found = validateNote(draft);
    if (Object.keys(found).length > 0) {
      setDraftErrors(found);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await SettingsService.addNote(draft);
      applyNotes([created, ...notes]);
      setDraft({ title: '', body: '', date: today() });
      setDraftErrors({});
      setComposing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the note.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    setBusyId(id);
    try {
      await SettingsService.deleteNote(id);
      applyNotes(notes.filter((note) => note.id !== id));
      setConfirmingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that entry.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg bg-chip p-2 text-heading">
            <FiActivity size={16} />
          </span>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-heading">Daily activity log</h2>
            <p className="mt-1 text-xs text-muted">
              Your own notes plus a record of what admins changed, kept day by day.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleRefresh} disabled={refreshing} className="btn-ghost">
            <FiRefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          {!composing && (
            <button type="button" onClick={() => setComposing(true)} className="btn-primary">
              <FiPlus size={14} /> Write a note
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-brand">{error}</p>
      )}

      {composing && (
        <div className="mt-6 rounded-lg border border-line bg-chip/40 p-5">
          <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
            <div>
              <label className="field-label" htmlFor="note-title">
                Title (optional)
              </label>
              <input
                id="note-title"
                className="field-input mt-2"
                maxLength={NOTE_LIMITS.title}
                value={draft.title}
                placeholder="Stock take, supplier visit, price review…"
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
              {draftErrors.title && <p className="mt-1.5 text-xs text-brand">{draftErrors.title}</p>}
            </div>

            <div>
              <label className="field-label" htmlFor="note-date">
                Day
              </label>
              <input
                id="note-date"
                type="date"
                className="field-input mt-2"
                value={draft.date}
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
              />
              {draftErrors.date && <p className="mt-1.5 text-xs text-brand">{draftErrors.date}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="note-body">
                What happened
              </label>
              <textarea
                id="note-body"
                rows={10}
                className="field-input mt-2 resize-y leading-7"
                maxLength={NOTE_LIMITS.body}
                value={draft.body}
                placeholder="Write as much as you need — deliveries taken, calls made, decisions agreed, anything worth remembering later."
                onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
              />
              <div className="mt-1.5 flex flex-wrap justify-between gap-2">
                {draftErrors.body ? (
                  <p className="text-xs text-brand">{draftErrors.body}</p>
                ) : (
                  <span className="text-xs text-faint">Line breaks are kept exactly as you type them.</span>
                )}
                <span className="text-xs text-faint">
                  {draft.body.length.toLocaleString()} / {NOTE_LIMITS.body.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={saveNote} disabled={saving} className="btn-primary">
              <FiEdit3 size={14} /> {saving ? 'Saving…' : 'Save note'}
            </button>
            <button
              type="button"
              onClick={() => {
                setComposing(false);
                setDraftErrors({});
              }}
              disabled={saving}
              className="btn-ghost"
            >
              <FiX size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
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
              {option.value === 'all' ? notes.length : notes.filter((note) => note.kind === option.value).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((slot) => (
            <div key={slot} className="h-20 animate-pulse rounded-lg bg-skeleton" />
          ))}
        </div>
      ) : days.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-line px-6 py-16 text-center">
          <FiCalendar size={32} className="mx-auto text-faint" />
          <p className="mt-5 text-sm font-semibold text-heading">Nothing logged yet</p>
          <p className="mt-1.5 text-xs text-muted">
            Write your first note, or make a change elsewhere in the console and it will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {days.map(([date, entries]) => (
            <div key={date}>
              <h3 className="sticky top-20 z-10 -mx-1 bg-panel/95 px-1 py-1 text-xs font-bold uppercase tracking-[0.1em] text-muted backdrop-blur">
                {formatDay(date)}
                <span className="ml-2 font-semibold normal-case tracking-normal text-faint">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </span>
              </h3>

              {/* A rail down the left ties the day's entries together. */}
              <ol className="mt-3 space-y-3 border-l-2 border-line pl-5">
                {entries.map((note) => (
                  <li key={note.id} className="relative">
                    <span
                      className={`absolute -left-[1.6rem] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-panel ${
                        note.kind === 'activity' ? 'bg-line' : 'bg-brand'
                      }`}
                    />

                    <article className="rounded-lg border border-line p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <h4 className="min-w-0 text-sm font-bold text-heading">
                          {note.title || (note.kind === 'activity' ? 'Activity' : 'Note')}
                        </h4>
                        <span className="shrink-0 text-[11px] font-semibold text-faint">
                          {note.authorName}
                          {formatTime(note.createdAt) && ` · ${formatTime(note.createdAt)}`}
                        </span>
                      </div>

                      {note.body && (
                        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink">{note.body}</p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                            note.kind === 'activity' ? 'bg-chip text-muted' : 'bg-brand/10 text-brand'
                          }`}
                        >
                          {note.kind === 'activity' ? 'auto-recorded' : 'written note'}
                        </span>

                        {confirmingId === note.id ? (
                          <span className="inline-flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand">
                              <FiAlertTriangle size={12} /> Delete this entry?
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteNote(note.id)}
                              disabled={busyId === note.id}
                              className="rounded-lg bg-brand px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-brand-hover disabled:opacity-40"
                            >
                              {busyId === note.id ? 'Deleting…' : 'Yes, delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingId(null)}
                              disabled={busyId === note.id}
                              className="rounded-lg border border-line px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted transition hover:bg-chip"
                            >
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmingId(note.id)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-faint transition hover:text-brand"
                          >
                            <FiTrash2 size={12} /> Delete
                          </button>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
