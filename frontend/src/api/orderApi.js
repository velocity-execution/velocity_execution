import { apiClient } from './client';

export const orderApi = {
  createOrder: (data) => apiClient.post('/orders', data),
  getOpenOrders: () => apiClient.get('/orders/open'),
  getOrderHistory: () => apiClient.get('/orders/history'),
  getOrderById: (id) => apiClient.get(`/orders/${id}`),
  updateOrder: (id, data) => apiClient.patch(`/orders/${id}`, data),
  cancelOrder: (id) => apiClient.delete(`/orders/${id}`),
};



