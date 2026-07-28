import axios from 'axios';
import { auth } from '@/firebase/firebase';
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
  /** Readable by anyone — nothing in the settings document is a secret. */
  async getSettings() {
    return apiRequest<StoreSettings>('/api/settings', 'GET');
  },

  /** Admin only — replaces the whole document. */
  async saveSettings(settings: StoreSettings) {
    return apiRequest<StoreSettings>('/api/settings', 'PUT', settings);
  },

  /** Admin only — hand-written notes and auto-recorded activity, newest day first. */
  async getNotes() {
    return apiRequest<ActivityNote[]>('/api/settings/notes', 'GET');
  },

  async addNote(note: { title: string; body: string; date: string }) {
    return apiRequest<ActivityNote>('/api/settings/notes', 'POST', note);
  },

  async deleteNote(id: string) {
    return apiRequest<{ success: boolean; id: string }>(
      `/api/settings/notes?id=${encodeURIComponent(id)}`,
      'DELETE'
    );
  },
};
