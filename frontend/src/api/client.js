import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  // Retrieve token from localStorage (or another secure storage mechanism)
  const token = localStorage.getItem('access_token');
  
  // If no token is set in local storage, you can temporarily hardcode one for testing 
  // if your identity-service allows bypasses, or leave it to fail so you know auth is required.
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Development fallback (replace with real token when identity service is ready)
    // no token
  }
  
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error.response?.data || { message: 'An unexpected error occurred' });
  }
);
