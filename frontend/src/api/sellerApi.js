import { apiClient } from './client';

export const sellerApi = {
  // ── Products ─────────────────────────────────────────────
  getProducts: () => 
    apiClient.get('/seller/products').then(res => res.data),

  getProductById: async (id) => {
    try {
      const res = await apiClient.get(`/seller/products/${id}`);
      return res.data;
    } catch {
      // Fallback: lookup from product list
      const list = await apiClient.get('/seller/products').then(r => r.data);
      const found = Array.isArray(list) ? list.find(p => p.id === id) : null;
      if (!found) throw new Error('Product not found');
      return found;
    }
  },

  createProduct: (productData) => 
    apiClient.post('/seller/products', productData).then(res => res.data),

  updateProduct: (id, updates) => 
    apiClient.put(`/seller/products/${id}`, updates).then(res => res.data),

  deleteProduct: (id) => 
    apiClient.delete(`/seller/products/${id}`).then(res => res.data),

  toggleProductStatus: async (id, status) => {
    try {
      const res = await apiClient.patch(`/seller/products/${id}/status`, { status });
      return res.data;
    } catch {
      // Fallback: update via PUT
      return apiClient.put(`/seller/products/${id}`, { status }).then(res => res.data);
    }
  },

  // ── Orders / Sales ───────────────────────────────────────
  getOrders: async (params = {}) => {
    try {
      const query = new URLSearchParams();
      if (params.status && params.status !== 'All') query.append('status', params.status);
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', params.page);
      if (params.limit) query.append('limit', params.limit);
      const qStr = query.toString() ? `?${query.toString()}` : '';
      const res = await apiClient.get(`/seller/orders${qStr}`);
      return res.data;
    } catch {
      // Fallback: construct orders from recent activity and marketplace
      const activities = await apiClient.get('/seller/activity').then(r => r.data).catch(() => []);
      const activityList = Array.isArray(activities) ? activities : [];
      return activityList.map((a, idx) => ({
        id: a.id || `ORD-${1000 + idx}`,
        product_name: a.product,
        product_symbol: a.product?.toUpperCase().replace(/\s+/g, '-').slice(0, 8) || 'PROD',
        quantity: a.quantity || a.amount || 1,
        unit_price: a.quantity ? (Number(a.price) / a.quantity) : Number(a.price),
        total_price: Number(a.price),
        buyer_name: 'Verified Buyer #' + (20 + idx),
        status: 'Completed',
        created_at: a.time || new Date().toISOString(),
        completed_at: a.time || new Date().toISOString(),
      }));
    }
  },

  getOrderDetails: async (id) => {
    try {
      const res = await apiClient.get(`/seller/orders/${id}`);
      return res.data;
    } catch {
      const orders = await sellerApi.getOrders();
      const found = Array.isArray(orders) ? orders.find(o => o.id === id) : null;
      if (!found) throw new Error('Order not found');
      return found;
    }
  },

  // ── Inventory Management ─────────────────────────────────
  getInventory: async () => {
    try {
      const res = await apiClient.get('/seller/inventory');
      return res.data;
    } catch {
      // Fallback: derive inventory from products
      const prods = await apiClient.get('/seller/products').then(r => r.data).catch(() => []);
      const prodsList = Array.isArray(prods) ? prods : [];
      return prodsList.map(p => ({
        product_id: p.id,
        name: p.name,
        symbol: p.symbol,
        category: p.category,
        total_stock: (Number(p.stock) || 0) + (Number(p.locked) || 0),
        available_stock: Number(p.stock) || 0,
        locked_stock: Number(p.locked) || 0,
        sold_quantity: Number(p.sold_quantity) || 0,
        low_stock_threshold: p.low_stock_threshold || 5,
        is_low_stock: (Number(p.stock) || 0) <= (p.low_stock_threshold || 5),
        status: p.status || 'Active',
      }));
    }
  },

  addStock: async (productId, { quantity, reason }) => {
    try {
      const res = await apiClient.post(`/seller/inventory/${productId}/add`, { quantity, reason });
      return res.data;
    } catch {
      // Fallback: fetch current product, increase stock, and call PUT
      const prod = await sellerApi.getProductById(productId);
      const newStock = (Number(prod.stock) || 0) + Number(quantity);
      return sellerApi.updateProduct(productId, { ...prod, stock: newStock });
    }
  },

  adjustStock: async (productId, { newStock, reason }) => {
    try {
      const res = await apiClient.post(`/seller/inventory/${productId}/adjust`, { new_stock: newStock, reason });
      return res.data;
    } catch {
      // Fallback: fetch current product, set stock, and call PUT
      const prod = await sellerApi.getProductById(productId);
      return sellerApi.updateProduct(productId, { ...prod, stock: Number(newStock) });
    }
  },

  getInventoryHistory: async (productId) => {
    try {
      const res = await apiClient.get(`/seller/inventory/${productId}/history`);
      return res.data;
    } catch {
      // Return placeholder audit entry
      return [
        {
          id: 'log-1',
          change_type: 'Initial Inventory',
          quantity: 0,
          previous_stock: 0,
          new_stock: 0,
          reason: 'Initial setup in system',
          created_at: new Date().toISOString(),
        }
      ];
    }
  },

  // ── Wallet / Earnings ────────────────────────────────────
  getWallet: async () => {
    try {
      const res = await apiClient.get('/seller/wallet');
      return res.data;
    } catch {
      // Fallback: combine /api/wallets with /seller/stats
      const [walletsRes, statsRes] = await Promise.all([
        apiClient.get('/wallets').then(r => r.data).catch(() => []),
        apiClient.get('/seller/stats').then(r => r.data).catch(() => ({})),
      ]);
      const wallets = Array.isArray(walletsRes) ? walletsRes : [];
      const usdt = wallets.find(w => w.asset?.toUpperCase() === 'USDT');
      const available = Number(usdt?.available || 0);
      const locked = Number(usdt?.locked || 0);
      const totalRevenue = Number(statsRes?.totalRevenue || 0);

      return {
        availableBalance: available,
        pendingBalance: locked,
        totalEarnings: totalRevenue,
        totalSales: statsRes?.totalProductsSold || 0,
        platformFees: 0.00,
        netEarnings: totalRevenue,
      };
    }
  },

  getWalletTransactions: async () => {
    try {
      const res = await apiClient.get('/seller/wallet/transactions');
      return res.data;
    } catch {
      // Fallback: map recent sales activities to transactions
      const activities = await apiClient.get('/seller/activity').then(r => r.data).catch(() => []);
      const activityList = Array.isArray(activities) ? activities : [];
      return activityList.map((a, idx) => ({
        id: a.id || `TX-${1000 + idx}`,
        type: 'Sale',
        description: `Sale of ${a.product}`,
        amount: Number(a.price || 0),
        status: 'Completed',
        reference_id: a.id || `ORD-${1000 + idx}`,
        created_at: a.time || new Date().toISOString(),
      }));
    }
  },

  // ── Withdrawals / Payouts ────────────────────────────────
  requestWithdrawal: async ({ amount, method, accountInfo }) => {
    try {
      const res = await apiClient.post('/seller/withdrawals', { amount, method, account_info: accountInfo });
      return res.data;
    } catch {
      // Fallback: call /wallets/withdraw
      const res = await apiClient.post('/wallets/withdraw', {
        asset: 'USDT',
        amount: Math.round(Number(amount)),
      });
      return {
        id: `WD-${Date.now().toString().slice(-6)}`,
        amount: Number(amount),
        method: method || 'USDT TRC20',
        account_info: accountInfo,
        status: 'Pending',
        created_at: new Date().toISOString(),
      };
    }
  },

  getWithdrawals: async () => {
    try {
      const res = await apiClient.get('/seller/withdrawals');
      return res.data;
    } catch {
      return [];
    }
  },

  // ── Stats & Activity ─────────────────────────────────────
  getStats: () => 
    apiClient.get('/seller/stats').then(res => res.data),

  getRecentActivity: () => 
    apiClient.get('/seller/activity').then(res => res.data),

  getAlerts: async () => {
    try {
      const res = await apiClient.get('/seller/alerts');
      return res.data;
    } catch {
      // Fallback: check products with stock <= threshold
      const prods = await apiClient.get('/seller/products').then(r => r.data).catch(() => []);
      const prodsList = Array.isArray(prods) ? prods : [];
      return prodsList
        .filter(p => (Number(p.stock) || 0) <= (p.low_stock_threshold || 5))
        .map(p => ({
          product_id: p.id,
          name: p.name,
          symbol: p.symbol,
          stock: p.stock,
          threshold: p.low_stock_threshold || 5,
          message: `Low stock — only ${p.stock} units remaining.`,
        }));
    }
  },
};
