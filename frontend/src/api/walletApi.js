import { apiClient } from './client';

export const walletApi = {
  getWallets: () => apiClient.get('/wallets/'),
  getWalletBalance: (asset) => apiClient.get(`/wallets/${asset}`),
  
  /**
   * Deposit funds into the wallet
   * @param {Object} data DepositWalletRequest
   * @param {string} data.asset e.g., "USDT"
   * @param {number} data.amount int64 (amount to deposit)
   */
  deposit: (data) => apiClient.post('/wallets/deposit', data),
  
  /**
   * Withdraw funds from the wallet
   * @param {Object} data WithdrawWalletRequest
   * @param {string} data.asset e.g., "USDT"
   * @param {number} data.amount int64 (amount to withdraw)
   */
  withdraw: (data) => apiClient.post('/wallets/withdraw', data),
};
