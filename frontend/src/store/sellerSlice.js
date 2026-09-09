import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { sellerApi } from '../api/sellerApi';

// ── Products ───────────────────────────────────────────────
export const fetchSellerProducts = createAsyncThunk('seller/fetchProducts', async (_, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getProducts();
    const data = res?.data !== undefined ? res.data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch products');
  }
});

export const fetchProductDetails = createAsyncThunk('seller/fetchProductDetails', async (id, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getProductById(id);
    return res?.data !== undefined ? res.data : res;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch product details');
  }
});

export const createProduct = createAsyncThunk('seller/createProduct', async (productData, { rejectWithValue }) => {
  try {
    const res = await sellerApi.createProduct(productData);
    return res?.data !== undefined ? res.data : res;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to create product');
  }
});

export const updateProduct = createAsyncThunk('seller/updateProduct', async ({ id, updates }, { rejectWithValue }) => {
  try {
    const res = await sellerApi.updateProduct(id, updates);
    return res?.data !== undefined ? res.data : res;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to update product');
  }
});

export const deleteProduct = createAsyncThunk('seller/deleteProduct', async (id, { rejectWithValue }) => {
  try {
    const res = await sellerApi.deleteProduct(id);
    return res?.data !== undefined ? res.data : { id };
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to delete product');
  }
});

export const toggleProductStatus = createAsyncThunk('seller/toggleProductStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const res = await sellerApi.toggleProductStatus(id, status);
    return { id, status, data: res?.data !== undefined ? res.data : res };
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to toggle product status');
  }
});

// ── Orders / Sales ─────────────────────────────────────────
export const fetchSellerOrders = createAsyncThunk('seller/fetchOrders', async (params = {}, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getOrders(params);
    const data = res?.data !== undefined ? res.data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch seller orders');
  }
});

export const fetchOrderDetails = createAsyncThunk('seller/fetchOrderDetails', async (id, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getOrderDetails(id);
    return res?.data !== undefined ? res.data : res;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch order details');
  }
});

// ── Inventory Management ───────────────────────────────────
export const fetchSellerInventory = createAsyncThunk('seller/fetchInventory', async (_, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getInventory();
    const data = res?.data !== undefined ? res.data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch inventory');
  }
});

export const addStock = createAsyncThunk('seller/addStock', async ({ productId, quantity, reason }, { dispatch, rejectWithValue }) => {
  try {
    const res = await sellerApi.addStock(productId, { quantity, reason });
    dispatch(fetchSellerInventory());
    dispatch(fetchSellerProducts());
    return res?.data !== undefined ? res.data : res;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to add stock');
  }
});

export const adjustStock = createAsyncThunk('seller/adjustStock', async ({ productId, newStock, reason }, { dispatch, rejectWithValue }) => {
  try {
    const res = await sellerApi.adjustStock(productId, { newStock, reason });
    dispatch(fetchSellerInventory());
    dispatch(fetchSellerProducts());
    return res?.data !== undefined ? res.data : res;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to adjust stock');
  }
});

export const fetchInventoryHistory = createAsyncThunk('seller/fetchInventoryHistory', async (productId, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getInventoryHistory(productId);
    const data = res?.data !== undefined ? res.data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch inventory history');
  }
});

// ── Wallet / Earnings ──────────────────────────────────────
export const fetchSellerWallet = createAsyncThunk('seller/fetchWallet', async (_, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getWallet();
    return res?.data !== undefined ? res.data : res;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch wallet information');
  }
});

export const fetchWalletTransactions = createAsyncThunk('seller/fetchWalletTransactions', async (_, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getWalletTransactions();
    const data = res?.data !== undefined ? res.data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch transactions');
  }
});

// ── Withdrawals / Payouts ──────────────────────────────────
export const requestWithdrawal = createAsyncThunk('seller/requestWithdrawal', async ({ amount, method, accountInfo }, { dispatch, rejectWithValue }) => {
  try {
    const res = await sellerApi.requestWithdrawal({ amount, method, accountInfo });
    dispatch(fetchSellerWallet());
    dispatch(fetchWalletTransactions());
    dispatch(fetchWithdrawals());
    return res?.data !== undefined ? res.data : res;
  } catch (err) {
    return rejectWithValue(err.message || 'Withdrawal request failed');
  }
});

export const fetchWithdrawals = createAsyncThunk('seller/fetchWithdrawals', async (_, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getWithdrawals();
    const data = res?.data !== undefined ? res.data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch withdrawals');
  }
});

// ── Stats & Dashboard ──────────────────────────────────────
export const fetchSellerStats = createAsyncThunk('seller/fetchStats', async (_, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getStats();
    return res?.data !== undefined ? res.data : res;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch stats');
  }
});

export const fetchSellerActivity = createAsyncThunk('seller/fetchActivity', async (_, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getRecentActivity();
    const data = res?.data !== undefined ? res.data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch activity');
  }
});

export const fetchSellerAlerts = createAsyncThunk('seller/fetchAlerts', async (_, { rejectWithValue }) => {
  try {
    const res = await sellerApi.getAlerts();
    const data = res?.data !== undefined ? res.data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch alerts');
  }
});

const sellerSlice = createSlice({
  name: 'seller',
  initialState: {
    products: [],
    currentProduct: null,
    orders: [],
    currentOrder: null,
    inventory: [],
    inventoryHistory: [],
    wallet: null,
    transactions: [],
    withdrawals: [],
    stats: null,
    activity: [],
    alerts: [],
    loading: false,
    orderLoading: false,
    inventoryLoading: false,
    walletLoading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentProduct: (state, action) => {
      state.currentProduct = action.payload;
    },
    setCurrentOrder: (state, action) => {
      state.currentOrder = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Products
      .addCase(fetchSellerProducts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSellerProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload || [];
      })
      .addCase(fetchSellerProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Product Details
      .addCase(fetchProductDetails.pending, (state) => { state.loading = true; })
      .addCase(fetchProductDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Product
      .addCase(createProduct.fulfilled, (state, action) => {
        state.products.unshift(action.payload);
        state.successMessage = 'Product created successfully!';
      })

      // Update Product
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.products.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.products[index] = { ...state.products[index], ...action.payload };
        }
        if (state.currentProduct?.id === action.payload.id) {
          state.currentProduct = { ...state.currentProduct, ...action.payload };
        }
        state.successMessage = 'Product updated successfully!';
      })

      // Delete Product
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter(p => p.id !== action.payload.id);
        state.successMessage = 'Product deleted successfully!';
      })

      // Toggle Status
      .addCase(toggleProductStatus.fulfilled, (state, action) => {
        const p = state.products.find(item => item.id === action.payload.id);
        if (p) p.status = action.payload.status;
        if (state.currentProduct?.id === action.payload.id) {
          state.currentProduct.status = action.payload.status;
        }
        const inv = state.inventory.find(item => item.product_id === action.payload.id);
        if (inv) inv.status = action.payload.status;
      })

      // Orders
      .addCase(fetchSellerOrders.pending, (state) => { state.orderLoading = true; })
      .addCase(fetchSellerOrders.fulfilled, (state, action) => {
        state.orderLoading = false;
        state.orders = action.payload;
      })
      .addCase(fetchSellerOrders.rejected, (state, action) => {
        state.orderLoading = false;
        state.error = action.payload;
      })

      // Order Details
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
      })

      // Inventory
      .addCase(fetchSellerInventory.pending, (state) => { state.inventoryLoading = true; })
      .addCase(fetchSellerInventory.fulfilled, (state, action) => {
        state.inventoryLoading = false;
        state.inventory = action.payload;
      })
      .addCase(fetchSellerInventory.rejected, (state, action) => {
        state.inventoryLoading = false;
        state.error = action.payload;
      })

      // Inventory History
      .addCase(fetchInventoryHistory.fulfilled, (state, action) => {
        state.inventoryHistory = action.payload;
      })

      // Wallet
      .addCase(fetchSellerWallet.pending, (state) => { state.walletLoading = true; })
      .addCase(fetchSellerWallet.fulfilled, (state, action) => {
        state.walletLoading = false;
        state.wallet = action.payload;
      })
      .addCase(fetchSellerWallet.rejected, (state, action) => {
        state.walletLoading = false;
        state.error = action.payload;
      })

      // Wallet Transactions
      .addCase(fetchWalletTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload;
      })

      // Withdrawals
      .addCase(fetchWithdrawals.fulfilled, (state, action) => {
        state.withdrawals = action.payload;
      })
      .addCase(requestWithdrawal.fulfilled, (state, action) => {
        state.withdrawals.unshift(action.payload);
        state.successMessage = 'Withdrawal requested successfully!';
      })

      // Stats
      .addCase(fetchSellerStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })

      // Activity
      .addCase(fetchSellerActivity.fulfilled, (state, action) => {
        state.activity = action.payload;
      })

      // Alerts
      .addCase(fetchSellerAlerts.fulfilled, (state, action) => {
        state.alerts = action.payload;
      });
  },
});

export const { clearSuccessMessage, clearError, setCurrentProduct, setCurrentOrder } = sellerSlice.actions;
export default sellerSlice.reducer;
