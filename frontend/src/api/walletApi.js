import { apiClient } from './client';

// Mock data for development
const mockWallets = [
  { asset: 'USD', available: 10000.50, locked: 500.00 },
  { asset: 'BTC', available: 1.25, locked: 0.1 },
  { asset: 'ETH', available: 15.4, locked: 2.0 },
  { asset: 'SOL', available: 150.0, locked: 0.0 },
];

export const walletApi = {
  getWallets: () => Promise.resolve(mockWallets),
  getWalletBalance: (asset) => Promise.resolve(mockWallets.find(w => w.asset === asset) || { asset, available: 0, locked: 0 }),
  
  deposit: (data) => Promise.resolve({ success: true, ...data }),
  withdraw: (data) => Promise.resolve({ success: true, ...data }),
};
