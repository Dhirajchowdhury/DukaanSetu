import axios from 'axios';
import { API_URL } from '../config/api';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  timeout: 10000,
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh, log responses, and validate contracts
api.interceptors.response.use(
  (response) => {
    // API Contract Logger
    console.log(`[API RESPONSE] [SUCCESS] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data
    });

    // Contract validation and defensive fallbacks
    const url = response.config.url || '';
    const method = (response.config.method || '').toLowerCase();

    if (url.includes('/products') && method === 'get') {
      const data = response.data || {};
      if (!data.products || !Array.isArray(data.products)) {
        console.warn(`[API CONTRACT WARNING] GET /products expected products array, got:`, data.products);
        if (!response.data) response.data = {};
        response.data.products = [];
      }
      if (!data.pagination || typeof data.pagination !== 'object') {
        console.warn(`[API CONTRACT WARNING] GET /products expected pagination object, got:`, data.pagination);
        if (!response.data) response.data = {};
        response.data.pagination = { page: 1, limit: 20, total: 0, pages: 1 };
      }
    }

    if (url.includes('/categories') && method === 'get') {
      const data = response.data || {};
      if (!data.categories || !Array.isArray(data.categories)) {
        console.warn(`[API CONTRACT WARNING] GET /categories expected categories array, got:`, data.categories);
        if (!response.data) response.data = {};
        response.data.categories = [];
      }
    }

    return response;
  },
  async (error) => {
    // Silently ignore cancelled/aborted requests
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    console.error(`[API RESPONSE] [ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });

    const errMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
    if (error.response?.status !== 401) {
      toast.error(errMessage);
    }

    const originalRequest = error.config;

    if (error.response?.status === 401) {
      // Token expired — try refresh once
      if (error.response?.data?.expired && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {}, {
            withCredentials: true,
            timeout: 10000,
          });

          localStorage.setItem('accessToken', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      // Invalid / missing token — redirect immediately
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
