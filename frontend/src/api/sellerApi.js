import { apiClient } from './client';

export const sellerApi = {
  getProducts: () => apiClient.get('/seller/products').then(res => res.data),

  getStats: () => apiClient.get('/seller/stats').then(res => res.data),

  getRecentActivity: () => apiClient.get('/seller/activity').then(res => res.data),

  createProduct: (productData) => apiClient.post('/seller/products', productData).then(res => res.data),

  updateProduct: (id, updates) => apiClient.put(`/seller/products/${id}`, updates).then(res => res.data),

  deleteProduct: (id) => apiClient.delete(`/seller/products/${id}`).then(res => res.data),
};
