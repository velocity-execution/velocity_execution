const API_BASE = '/api'; // prefix /api for vite proxy to backend

/**
 * Generic fetch wrapper for API calls
 */
async function fetchAPI(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || 'An error occurred while communicating with the server.');
  }

  return data;
}

export const authAPI = {
  login: (credentials) => 
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    
  register: (userData) => 
    fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  forgotPassword: (phone) => 
    fetchAPI('/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOTP: (phone, code, purpose) => 
    fetchAPI('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, purpose }),
    }),

  resetPassword: (phone, code, newPassword) =>
    fetchAPI('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ phone, code, new_password: newPassword }),
    }),

  refreshToken: (refreshToken) =>
    fetchAPI('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),
};
