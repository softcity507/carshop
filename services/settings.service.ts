import axios from 'axios';
import { auth } from '@/firebase/firebase';
import { TTL, cached, invalidate } from '@/lib/dataCache';
import type { ActivityNote, StoreSettings } from '@/types/settings';

async function getAuthToken() {
  if (typeof window === 'undefined') return null;

  // Always prefer a live token — a cached one may be past its 1 hour expiry.
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    window.sessionStorage.setItem('carhub_token', token);
    window.localStorage.setItem('carhub_token', token);
    return token;
  }

  return window.sessionStorage.getItem('carhub_token') || window.localStorage.getItem('carhub_token');
}

async function apiRequest<T>(url: string, method: string, body?: unknown): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await axios.request<T>({ url, method, data: body, headers });
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const payload = err.response?.data as { error?: string } | undefined;
      throw new Error(payload?.error ?? err.message);
    }
    throw err;
  }
}

export const SettingsService = {
  /**
   * Readable by anyone — nothing in the settings document is a secret. Asked for by the checkout
   * form, the dashboard and the settings page, so it is worth holding on to.
   */
  async getSettings(force = false) {
    return cached('settings:store', TTL.stable, () => apiRequest<StoreSettings>('/api/settings', 'GET'), force);
  },

  /** Admin only — replaces the whole document. */
  async saveSettings(settings: StoreSettings) {
    const saved = await apiRequest<StoreSettings>('/api/settings', 'PUT', settings);
    // Saving also writes an activity entry, so the log is stale too.
    invalidate('settings');
    return saved;
  },

  /** Admin only — hand-written notes and auto-recorded activity, newest day first. */
  async getNotes(force = false) {
    return cached(
      'settings:notes',
      TTL.volatile,
      () => apiRequest<ActivityNote[]>('/api/settings/notes', 'GET'),
      force
    );
  },

  async addNote(note: { title: string; body: string; date: string }) {
    const created = await apiRequest<ActivityNote>('/api/settings/notes', 'POST', note);
    invalidate('settings:notes');
    return created;
  },

  async deleteNote(id: string) {
    const result = await apiRequest<{ success: boolean; id: string }>(
      `/api/settings/notes?id=${encodeURIComponent(id)}`,
      'DELETE'
    );
    invalidate('settings:notes');
    return result;
  },
};
