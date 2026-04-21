// Central API helper for all frontend-to-backend calls
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Get stored JWT token
const getToken = (): string | null => {
  return localStorage.getItem('pasabuy_token');
};

// Set JWT token
export const setToken = (token: string) => {
  localStorage.setItem('pasabuy_token', token);
};

// Remove JWT token
export const removeToken = () => {
  localStorage.removeItem('pasabuy_token');
};

// Generic fetch wrapper with auth
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
};

// =============================================
// AUTH
// =============================================
export const authApi = {
  loginWithGoogle: (userData: any) =>
    apiFetch('/auth/google', { method: 'POST', body: JSON.stringify(userData) }),

  loginOnly: (email: string) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email }) }),

  getMe: () => apiFetch('/auth/me'),
};

// =============================================
// PRODUCTS
// =============================================
export const productsApi = {
  getAll: (params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return apiFetch(`/products${qs ? `?${qs}` : ''}`);
  },

  getOne: (id: number) => apiFetch(`/products/${id}`),

  create: (formData: FormData) =>
    apiFetch('/products', { method: 'POST', body: formData }),

  update: (id: number, formData: FormData) =>
    apiFetch(`/products/${id}`, { method: 'PUT', body: formData }),

  delete: (id: number) =>
    apiFetch(`/products/${id}`, { method: 'DELETE' }),
};

// =============================================
// ORDERS
// =============================================
export const ordersApi = {
  getAll: (params?: { status?: string; search?: string; personal?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.personal) query.append('personal', 'true');
    const qs = query.toString();
    return apiFetch(`/orders${qs ? `?${qs}` : ''}`);
  },

  create: (items: { product_id: number; quantity: number }[], customer_details?: any) =>
    apiFetch('/orders', { method: 'POST', body: JSON.stringify({ items, customer_details }) }),

  updateStatus: (id: number, status: string, delivery_date?: string) =>
    apiFetch(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, delivery_date }) }),

  bulkUpdateStatus: (order_ids: number[], status: string) =>
    apiFetch('/orders/bulk-status', { method: 'PUT', body: JSON.stringify({ order_ids, status }) }),

  getStats: () => apiFetch('/orders/stats'),
  cancel: (id: number, reason: string) =>
    apiFetch(`/orders/${id}/cancel`, { method: 'PUT', body: JSON.stringify({ reason }) }),
};

// =============================================
// CATEGORIES
// =============================================
export const categoriesApi = {
  getAll: () => apiFetch('/categories'),

  create: (name: string) =>
    apiFetch('/categories', { method: 'POST', body: JSON.stringify({ name }) }),

  delete: (id: number) =>
    apiFetch(`/categories/${id}`, { method: 'DELETE' }),
};

// =============================================
// SYSTEM CONFIG
// =============================================
export const configApi = {
  get: () => apiFetch('/config'),

  update: (config: Record<string, string>) =>
    apiFetch('/config', { method: 'PUT', body: JSON.stringify(config) }),
};

// =============================================
// USERS (Admin)
// =============================================
export const usersApi = {
  getAll: () => apiFetch('/users'),

  updateRole: (id: number, role: string) =>
    apiFetch(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

  delete: (id: number) =>
    apiFetch(`/users/${id}`, { method: 'DELETE' }),
};
