import axios from 'axios';
import { auth } from '@/firebase/firebase';
import type { Product, ProductInput, ProductType } from '@/types/product';

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

export const ProductService = {
  /** Storefront listing — published products only. */
  async getProducts(type?: ProductType) {
    const query = type ? `?type=${type}` : '';
    return apiRequest<Product[]>(`/api/products${query}`, 'GET');
  },

  /** Admin listing — includes drafts. Requires an admin session. */
  async getAllProducts(type?: ProductType) {
    const params = new URLSearchParams({ includeUnpublished: 'true' });
    if (type) params.set('type', type);
    return apiRequest<Product[]>(`/api/products?${params}`, 'GET');
  },

  async createProduct(payload: ProductInput) {
    return apiRequest<Product>('/api/products', 'POST', payload);
  },

  async updateProduct(id: string, payload: ProductInput) {
    return apiRequest<Product>('/api/products', 'PUT', { ...payload, id });
  },

  async deleteProduct(id: string) {
    return apiRequest<{ success: boolean; id: string }>(`/api/products?id=${encodeURIComponent(id)}`, 'DELETE');
  },
};
