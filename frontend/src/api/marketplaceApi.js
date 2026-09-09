import { apiClient } from './client';

const getCurrentUserId = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user?.id || user?.user_id || null;
  } catch (e) {
    return null;
  }
};

export const marketplaceApi = {
  getProducts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    const uid = params.userId || getCurrentUserId();
    if (uid) query.append('user_id', uid);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get(`/marketplace/products${queryString}`).then(res => res.data);
  },

  getWatchlist: () => {
    const uid = getCurrentUserId();
    const query = uid ? `?user_id=${uid}` : '';
    return apiClient.get(`/marketplace/watchlist${query}`).then(res => res.data);
  },

  toggleWatchlist: (productId) => {
    const uid = getCurrentUserId();
    const query = uid ? `?user_id=${uid}` : '';
    return apiClient.post(`/marketplace/watchlist/${productId}${query}`).then(res => res.data);
  },

  buyProduct: ({ productId, quantity = 1 }) => 
    apiClient.post('/marketplace/buy', { product_id: productId, quantity }).then(res => res.data),

  getBuyerOrders: () =>
    apiClient.get('/marketplace/orders').then(res => res.data),
};
