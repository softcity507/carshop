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

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem('carhub_token') || window.localStorage.getItem('carhub_token');
}

async function apiRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'API request failed');
  }

  return response.json();
}

export const UserService = {
  async getUsers() {
    return apiRequest<Array<Record<string, unknown>>>('/api/users', 'GET');
  },

  async createUser(payload: CreateUserPayload) {
    return apiRequest('/api/users', 'POST', payload);
  },

  async updateUser(payload: UpdateUserPayload) {
    return apiRequest('/api/users', 'PUT', payload);
  },

  async deleteUser(uid: string) {
    return apiRequest('/api/users', 'DELETE', { uid });
  },
};
