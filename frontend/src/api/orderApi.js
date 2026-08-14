import { apiClient } from './client';

export const orderApi = {
  /**
   * Submit a new order
   * @param {Object} data SubmitOrderRequest
   * @param {string} data.symbol e.g., "BTC_USDT"
   * @param {string} data.side e.g., "BUY" or "SELL"
   * @param {string} data.type e.g., "LIMIT" or "MARKET"
   * @param {string} data.time_in_force e.g., "GTC", "IOC"
   * @param {number} data.price int64 (price scaled)
   * @param {number} [data.stop_price] int64 (optional, for stop orders)
   * @param {number} data.quantity int64 (amount to buy/sell)
   */
  createOrder: (data) => apiClient.post('/orders/', data),
  getOpenOrders: () => apiClient.get('/orders/open'),
  getOrderHistory: () => apiClient.get('/orders/history'),
  getOrderById: (id) => apiClient.get(`/orders/${id}`),
  updateOrder: (id, data) => apiClient.patch(`/orders/${id}`, data),
  cancelOrder: (id) => apiClient.delete(`/orders/${id}`),
};
