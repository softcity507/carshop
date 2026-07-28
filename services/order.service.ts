import axios from 'axios';
import { auth } from '@/firebase/firebase';
import type { Order, OrderPatch } from '@/types/order';

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

export const OrderService = {
  /** Every order for an admin; the caller's own orders for anyone else. */
  async getOrders() {
    return apiRequest<Order[]>('/api/orders', 'GET');
  },

  /** Admin only — corrects status, payment state, delivery details or the internal note. */
  async updateOrder(id: string, patch: OrderPatch) {
    return apiRequest<Order>('/api/orders', 'PATCH', { id, ...patch });
  },

  /** Admin only — deletes the order record. Any Stripe charge must be refunded separately. */
  async deleteOrder(id: string) {
    return apiRequest<{ success: boolean; id: string }>(
      `/api/orders?id=${encodeURIComponent(id)}`,
      'DELETE'
    );
  },
};
