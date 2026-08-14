import { apiClient } from './client';

export const positionApi = {
  /**
   * Lists all open positions for the user.
   */
  getPositions: () => apiClient.get('/positions/'),
  
  /**
   * Gets the user's position for a specific symbol.
   * @param {string} symbol e.g., "BTC_USDT"
   */
  getPositionBySymbol: (symbol) => apiClient.get(`/positions/${symbol}`),
};
