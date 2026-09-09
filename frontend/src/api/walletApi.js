import { apiClient } from './client';

export const walletApi = {
  getWallets: () => apiClient.get('/wallets'),
  getWalletBalance: (asset) => apiClient.get(`/wallets/${asset}`),
  deposit: (data) => apiClient.post('/wallets/deposit', data),
  withdraw: (data) => apiClient.post('/wallets/withdraw', data),
};

