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

  /** The caller's own orders, whatever their role — what the customer history screen shows. */
  async getMyOrders() {
    return apiRequest<Order[]>('/api/orders?mine=true', 'GET');
  },

  /** Admin only — corrects status, payment state, delivery details or the internal note. */
  async updateOrder(id: string, patch: OrderPatch) {
    return apiRequest<Order>('/api/orders', 'PATCH', { id, ...patch });
  },

  /**
   * Deletes the order record. An admin may remove any order; a buyer may remove their own only
   * while it is still unpaid. Any Stripe charge must be refunded separately.
   */
  async deleteOrder(id: string) {
    return apiRequest<{ success: boolean; id: string }>(
      `/api/orders?id=${encodeURIComponent(id)}`,
      'DELETE'
    );
  },

  /** Buyer asks for their money back on a paid order — files the request for an admin to handle. */
  async requestRefund(id: string, reason: string) {
    return apiRequest<Order>('/api/orders/refund', 'POST', { id, reason });
  },

  /** Admin only — records the outcome once the refund has been issued or refused in Stripe. */
  async resolveRefund(id: string, decision: 'approved' | 'declined', note = '') {
    return apiRequest<Order>('/api/orders/refund', 'PATCH', { id, decision, note });
  },
};
