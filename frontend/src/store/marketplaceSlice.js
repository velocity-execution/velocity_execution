import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { marketplaceApi } from '../api/marketplaceApi';
import { fetchWallets } from './walletSlice';

export const fetchMarketplaceProducts = createAsyncThunk(
  'marketplace/fetchProducts',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await marketplaceApi.getProducts(params);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch products');
    }
  }
);

export const fetchWatchlist = createAsyncThunk(
  'marketplace/fetchWatchlist',
  async (_, { rejectWithValue }) => {
    try {
      const data = await marketplaceApi.getWatchlist();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch watchlist');
    }
  }
);

export const toggleWatchlist = createAsyncThunk(
  'marketplace/toggleWatchlist',
  async (productId, { rejectWithValue }) => {
    try {
      const data = await marketplaceApi.toggleWatchlist(productId);
      return { productId, isMonitored: data?.is_monitored };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update watchlist');
    }
  }
);

export const buyProduct = createAsyncThunk(
  'marketplace/buyProduct',
  async ({ productId, quantity }, { dispatch, rejectWithValue }) => {
    try {
      const result = await marketplaceApi.buyProduct({ productId, quantity });
      // Refresh wallet balance and product listings after purchase
      dispatch(fetchWallets());
      dispatch(fetchMarketplaceProducts());
      dispatch(fetchWatchlist());
      return result;
    } catch (err) {
      return rejectWithValue(err.message || 'Purchase failed');
    }
  }
);

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState: {
    products: [],
    watchlist: [],
    loading: false,
    watchlistLoading: false,
    buying: false,
    error: null,
    buySuccess: null,
  },
  reducers: {
    clearBuyStatus: (state) => {
      state.buySuccess = null;
      state.error = null;
    },
    resetMarketplaceState: (state) => {
      state.products = [];
      state.watchlist = [];
      state.error = null;
      state.buySuccess = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch products
      .addCase(fetchMarketplaceProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMarketplaceProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchMarketplaceProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch watchlist
      .addCase(fetchWatchlist.pending, (state) => {
        state.watchlistLoading = true;
      })
      .addCase(fetchWatchlist.fulfilled, (state, action) => {
        state.watchlistLoading = false;
        state.watchlist = action.payload;
      })
      .addCase(fetchWatchlist.rejected, (state) => {
        state.watchlistLoading = false;
      })

      // Toggle watchlist
      .addCase(toggleWatchlist.fulfilled, (state, action) => {
        const { productId, isMonitored } = action.payload;
        // Update product in products list
        const p = state.products.find(item => item.id === productId);
        if (p) {
          p.is_monitored = isMonitored;
        }
        // Update watchlist list
        if (!isMonitored) {
          state.watchlist = state.watchlist.filter(item => item.id !== productId);
        } else if (p && !state.watchlist.some(item => item.id === productId)) {
          state.watchlist.unshift({ ...p, is_monitored: true });
        }
      })

      // Buy product
      .addCase(buyProduct.pending, (state) => {
        state.buying = true;
        state.error = null;
        state.buySuccess = null;
      })
      .addCase(buyProduct.fulfilled, (state, action) => {
        state.buying = false;
        state.buySuccess = action.payload;
      })
      .addCase(buyProduct.rejected, (state, action) => {
        state.buying = false;
        state.error = action.payload;
      });
  }
});

export const { clearBuyStatus, resetMarketplaceState } = marketplaceSlice.actions;
export default marketplaceSlice.reducer;
