import { apiClient } from './client';

const mockSymbols = [
  { symbol: 'BTCUSDT', base_asset: 'BTC', quote_asset: 'USD', price: 62050.0, change24h: 1.9, volume24h: 1500.5, high24h: 63000, low24h: 60000 },
  { symbol: 'ETHUSDT', base_asset: 'ETH', quote_asset: 'USD', price: 2450.0, change24h: -0.5, volume24h: 8500.2, high24h: 2500, low24h: 2300 },
  { symbol: 'SOLUSDT', base_asset: 'SOL', quote_asset: 'USD', price: 145.0, change24h: 5.2, volume24h: 300.0, high24h: 150, low24h: 138 },
];

export const marketApi = {
  getSymbols: () => apiClient.get('/market/symbols'),
  getOrderBook: (symbol) => apiClient.get(`/market/orderbook/${symbol}`),
  getTicker: (symbol) => apiClient.get(`/market/ticker/${symbol}`),
  getTrades: (symbol) => apiClient.get(`/market/trades/${symbol}`),
  getStats: (symbol) => apiClient.get(`/market/stats/${symbol}`),
  getCandles: (symbol) => apiClient.get(`/market/${symbol}/candles?interval=1h`),
};


