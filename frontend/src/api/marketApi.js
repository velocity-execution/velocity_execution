import { apiClient } from './client';


export const marketApi = {
  getSymbols: () => apiClient.get('/market/symbols'),
  getOrderBook: (symbol) => apiClient.get(`/market/orderbook/${symbol}`),
  getTicker: (symbol) => apiClient.get(`/market/ticker/${symbol}`),
  getStats: (symbol) => apiClient.get(`/market/stats/${symbol}`),
  getTrades: (symbol) => apiClient.get(`/market/trades/${symbol}`),
  getCandles: (symbol, interval = '15m', limit = 150) =>
    apiClient.get(`/market/${symbol}/candles?interval=${interval}&limit=${limit}`),
};


