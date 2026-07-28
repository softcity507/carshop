import axios from 'axios';
import { auth } from '@/firebase/firebase';
import { TTL, cached, invalidate } from '@/lib/dataCache';
import type { ContactInput, ContactMessage, ContactStatus } from '@/types/contact';

async function getAuthToken() {
  if (typeof window === 'undefined') return null;

  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    window.sessionStorage.setItem('carhub_token', token);
    window.localStorage.setItem('carhub_token', token);
    return token;
  }

  return window.sessionStorage.getItem('carhub_token') || window.localStorage.getItem('carhub_token');
}

async function apiRequest<T>(url: string, method: string, body?: unknown, withAuth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (withAuth) {
    const token = await getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

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

export const ContactService = {
  /**
   * Public — sends an enquiry from the contact form. A session is not required, but the token is
   * sent when there is one so the admin inbox can show which account the message came from.
   */
  async sendMessage(payload: ContactInput) {
    const result = await apiRequest<{ success: boolean; id: string }>('/api/contact', 'POST', payload, true);
    invalidate('contact');
    return result;
  },

  /** Admin only — every enquiry, newest first, with the sender's account details attached. */
  async getMessages(force = false) {
    return cached(
      'contact:messages',
      TTL.volatile,
      () => apiRequest<ContactMessage[]>('/api/contact', 'GET', undefined, true),
      force
    );
  },

  /** Admin only — mark a message as read or archived. */
  async updateStatus(id: string, status: ContactStatus) {
    const result = await apiRequest<{ success: boolean; id: string; status: ContactStatus }>(
      '/api/contact',
      'PATCH',
      { id, status },
      true
    );
    invalidate('contact');
    return result;
  },

  /** Admin only. */
  async deleteMessage(id: string) {
    const result = await apiRequest<{ success: boolean; id: string }>(
      `/api/contact?id=${encodeURIComponent(id)}`,
      'DELETE',
      undefined,
      true
    );
    invalidate('contact');
    return result;
  },
};
