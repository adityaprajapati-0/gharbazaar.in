import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth API
export const authAPI = {
  signup: (data: any) => api.post('/auth/signup', data),
  login: (data: any) => api.post('/auth/login', data),
  sendOTP: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyPhone: (phone: string, otp: string) => api.post('/auth/verify-phone', { phone, otp }),
};

// Listings API
export const listingsAPI = {
  getAll: (params?: any) => api.get('/listings', { params }),
  getById: (id: string) => api.get(`/listings/${id}`),
  create: (data: any) => api.post('/listings', data),
  update: (id: string, data: any) => api.patch(`/listings/${id}`, data),
  delete: (id: string) => api.delete(`/listings/${id}`),
  feature: (id: string) => api.post(`/listings/${id}/feature`),
};

// Bids API
export const bidsAPI = {
  create: (data: any) => api.post('/bids', data),
  getForListing: (listingId: string) => api.get(`/bids/listing/${listingId}`),
  getMyBids: () => api.get('/bids/my-bids'),
  updateStatus: (id: string, status: string) => api.patch(`/bids/${id}/status`, { status }),
};

// Payments API
export const paymentsAPI = {
  createOrder: (data: any) => api.post('/payments/create-order', data),
  verify: (data: any) => api.post('/payments/verify', data),
  getInvoices: () => api.get('/payments/invoices'),
};

// Favorites API
export const favoritesAPI = {
  add: (listingId: string) => api.post('/favorites', { listingId }),
  remove: (listingId: string) => api.delete(`/favorites/${listingId}`),
  getAll: () => api.get('/favorites'),
  check: (listingId: string) => api.get(`/favorites/check/${listingId}`),
};

// Users API
export const usersAPI = {
  getMe: () => api.get('/users/me'),
  getById: (id: string) => api.get(`/users/${id}`),
  updateMe: (data: any) => api.patch('/users/me', data),
};
