import axios from 'axios';
import { getAccessToken, refreshAccessToken, clearAuthSession } from '../services/tokenService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach fresh Bearer token and current user ID
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const uid = user?.id || user?.user_id;
      if (uid) {
        config.headers['X-User-Id'] = uid;
      }
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  return config;
});

// Response Interceptor: Automatically refresh token on 401 and retry original request
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and not already retrying
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't retry if the failed request itself was the auth refresh or login endpoint
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        return Promise.reject(error.response?.data || error);
      }

      originalRequest._retry = true;

      try {
        console.log('[apiClient] 401 Unauthorized encountered. Refreshing token in background...');
        const newAccessToken = await refreshAccessToken();

        // Update Authorization header and retry
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        console.warn('[apiClient] Session expired — automatic refresh failed. Redirecting to login.');
        clearAuthSession();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error.response?.data || { message: 'An unexpected error occurred' });
  }
);
