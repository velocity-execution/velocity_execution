import { apiClient } from './client';

const mockOrders = [
  { id: '1', created_at: Date.now() - 3600000, symbol: 'BTCUSDT', side: 'buy', type: 'limit', price: 62000, quantity: 0.5, status: 'open' },
  { id: '2', created_at: Date.now() - 7200000, symbol: 'ETHUSDT', side: 'sell', type: 'limit', price: 2500, quantity: 10, status: 'open' },
  { id: '3', created_at: Date.now() - 86400000, symbol: 'SOLUSDT', side: 'buy', type: 'limit', price: 140, quantity: 50, status: 'open' },
];

export const orderApi = {
  createOrder: (data) => Promise.resolve({ id: Date.now().toString(), status: 'open', ...data }),
  getOpenOrders: () => Promise.resolve(mockOrders),
  getOrderHistory: () => Promise.resolve([
    { id: '4', created_at: Date.now() - 172800000, symbol: 'BTCUSDT', side: 'sell', type: 'market', price: 64000, quantity: 0.25, status: 'filled' },
    { id: '5', created_at: Date.now() - 259200000, symbol: 'ETHUSDT', side: 'buy', type: 'limit', price: 2300, quantity: 5, status: 'filled' },
  ]),
  getOrderById: (id) => Promise.resolve(mockOrders.find(o => o.id === id)),
  updateOrder: (id, data) => Promise.resolve({ id, ...data }),
  cancelOrder: (id) => Promise.resolve({ id, status: 'cancelled' }),
};


