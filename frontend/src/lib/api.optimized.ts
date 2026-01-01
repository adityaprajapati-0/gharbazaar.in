import axios, { AxiosError, AxiosResponse } from 'axios'
import { logger } from './logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Request cache for GET requests
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Create optimized axios instance
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor with caching
api.interceptors.request.use(
  (config) => {
    // Add auth token
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    logger.apiRequest(config.method?.toUpperCase() || 'GET', config.url || '', config.data)

    // Check cache for GET requests
    if (config.method === 'get' && config.url) {
      const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`
      const cached = requestCache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return Promise.reject({
          config,
          response: { data: cached.data, status: 200 },
          isCache: true,
        })
      }
    }

    return config
  },
  (error) => {
    logger.error('API Request Error', error)
    return Promise.reject(error)
  }
)

// Response interceptor with caching
api.interceptors.response.use(
  (response: AxiosResponse) => {
    logger.apiResponse(
      response.config.method?.toUpperCase() || 'GET',
      response.config.url || '',
      response.status
    )

    // Cache GET responses
    if (response.config.method === 'get' && response.config.url) {
      const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      })
    }

    return response
  },
  (error: AxiosError | any) => {
    // Handle cached responses
    if (error.isCache) {
      return Promise.resolve(error.response)
    }

    logger.error('API Response Error', error)

    // Handle 401
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Clear cache utilities
export const clearApiCache = () => requestCache.clear()
export const clearCacheEntry = (url: string, params?: any) => {
  const cacheKey = `${url}${JSON.stringify(params || {})}`
  requestCache.delete(cacheKey)
}

// Auth API
export const authAPI = {
  signup: (data: any) => api.post('/auth/signup', data),
  login: (data: any) => api.post('/auth/login', data),
  sendOTP: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyPhone: (phone: string, otp: string) => api.post('/auth/verify-phone', { phone, otp }),
}

// Listings API with cache invalidation
export const listingsAPI = {
  getAll: (params?: any) => api.get('/listings', { params }),
  getById: (id: string) => api.get(`/listings/${id}`),
  create: async (data: any) => {
    const response = await api.post('/listings', data)
    clearCacheEntry('/listings')
    return response
  },
  update: async (id: string, data: any) => {
    const response = await api.patch(`/listings/${id}`, data)
    clearCacheEntry(`/listings/${id}`)
    clearCacheEntry('/listings')
    return response
  },
  delete: async (id: string) => {
    const response = await api.delete(`/listings/${id}`)
    clearCacheEntry(`/listings/${id}`)
    clearCacheEntry('/listings')
    return response
  },
  feature: (id: string) => api.post(`/listings/${id}/feature`),
}

// Bids API
export const bidsAPI = {
  create: async (data: any) => {
    const response = await api.post('/bids', data)
    clearCacheEntry('/bids/my-bids')
    return response
  },
  getForListing: (listingId: string) => api.get(`/bids/listing/${listingId}`),
  getMyBids: () => api.get('/bids/my-bids'),
  updateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/bids/${id}/status`, { status })
    clearCacheEntry('/bids/my-bids')
    return response
  },
}

// Payments API
export const paymentsAPI = {
  createOrder: (data: any) => api.post('/payments/create-order', data),
  verify: (data: any) => api.post('/payments/verify', data),
  getInvoices: () => api.get('/payments/invoices'),
}

// Favorites API
export const favoritesAPI = {
  add: async (listingId: string) => {
    const response = await api.post('/favorites', { listingId })
    clearCacheEntry('/favorites')
    return response
  },
  remove: async (listingId: string) => {
    const response = await api.delete(`/favorites/${listingId}`)
    clearCacheEntry('/favorites')
    return response
  },
  getAll: () => api.get('/favorites'),
  check: (listingId: string) => api.get(`/favorites/check/${listingId}`),
}

// Users API
export const usersAPI = {
  getMe: () => api.get('/users/me'),
  getById: (id: string) => api.get(`/users/${id}`),
  updateMe: async (data: any) => {
    const response = await api.patch('/users/me', data)
    clearCacheEntry('/users/me')
    return response
  },
}
