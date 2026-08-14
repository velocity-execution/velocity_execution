import { apiClient } from './client';

export const marketApi = {
  getSymbols: () => apiClient.get('/market/symbols'),
  getOrderBook: (symbol) => apiClient.get(`/market/orderbook/${symbol}`),
  getTicker: (symbol) => apiClient.get(`/market/ticker/${symbol}`),
  getTrades: (symbol) => apiClient.get(`/market/trades/${symbol}`),
  getStats: (symbol) => apiClient.get(`/market/stats/${symbol}`),
  getCandles: (symbol) => apiClient.get(`/market/${symbol}/candles`),
};
