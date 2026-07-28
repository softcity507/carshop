import { auth } from '@/firebase/firebase';
import axios from 'axios';
import { TTL, cached, invalidate } from '@/lib/dataCache';

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

export interface UpdateUserPayload {
  uid: string;
  displayName?: string;
  email?: string;
  role?: 'user' | 'admin';
}

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

async function apiRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await axios.request<T>({
      url: path,
      method: method as any,
      data: body,
      headers,
    });

    console.log(`API Request: ${method} ${path}`, { body, status: response.status });
    return response.data;
  } catch (err: any) {
    if (axios.isAxiosError(err)) {
      const resp = err.response;
      const message = resp?.data?.error ?? resp?.data ?? err.message;
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }
    throw err;
  }
}

export const UserService = {
  async getUsers<T = Record<string, unknown>>(force = false) {
    return cached('users:all', TTL.steady, () => apiRequest<T[]>('/api/users', 'GET'), force);
  },

  async createUser(payload: CreateUserPayload) {
    const created = await apiRequest('/api/users', 'POST', payload);
    invalidate('users');
    return created;
  },

  async updateUser(payload: UpdateUserPayload) {
    const updated = await apiRequest('/api/users', 'PUT', payload);
    invalidate('users');
    return updated;
  },

  async deleteUser(uid: string) {
    const result = await apiRequest('/api/users', 'DELETE', { uid });
    invalidate('users');
    return result;
  },
};
 
 