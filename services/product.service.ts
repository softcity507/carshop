import axios from 'axios';
import { auth } from '@/firebase/firebase';
import { TTL, cached, invalidate } from '@/lib/dataCache';
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
  /** Storefront listing — published products only. Shared by the catalog and the featured strip. */
  async getProducts(type?: ProductType, force = false) {
    const query = type ? `?type=${type}` : '';
    return cached(
      `products:public:${type ?? 'all'}`,
      TTL.steady,
      () => apiRequest<Product[]>(`/api/products${query}`, 'GET'),
      force
    );
  },

  /** Single published product, for the detail page. */
  async getProduct(id: string, force = false) {
    return cached(
      `products:one:${id}`,
      TTL.steady,
      () => apiRequest<Product>(`/api/products/${encodeURIComponent(id)}`, 'GET'),
      force
    );
  },

  /** Admin listing — includes drafts. Requires an admin session. */
  async getAllProducts(type?: ProductType, force = false) {
    const params = new URLSearchParams({ includeUnpublished: 'true' });
    if (type) params.set('type', type);
    return cached(
      `products:admin:${type ?? 'all'}`,
      TTL.volatile,
      () => apiRequest<Product[]>(`/api/products?${params}`, 'GET'),
      force
    );
  },

  async createProduct(payload: ProductInput) {
    const created = await apiRequest<Product>('/api/products', 'POST', payload);
    invalidate('products');
    return created;
  },

  async updateProduct(id: string, payload: ProductInput) {
    const updated = await apiRequest<Product>('/api/products', 'PUT', { ...payload, id });
    invalidate('products');
    return updated;
  },

  async deleteProduct(id: string) {
    const result = await apiRequest<{ success: boolean; id: string }>(
      `/api/products?id=${encodeURIComponent(id)}`,
      'DELETE'
    );
    invalidate('products');
    return result;
  },
};
