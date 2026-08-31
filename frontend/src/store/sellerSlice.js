import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { sellerApi } from '../api/sellerApi';

export const fetchSellerProducts = createAsyncThunk('seller/fetchProducts', async () => {
  return await sellerApi.getProducts();
});

export const fetchSellerStats = createAsyncThunk('seller/fetchStats', async () => {
  return await sellerApi.getStats();
});

export const fetchSellerActivity = createAsyncThunk('seller/fetchActivity', async () => {
  return await sellerApi.getRecentActivity();
});

export const createProduct = createAsyncThunk('seller/createProduct', async (productData) => {
  return await sellerApi.createProduct(productData);
});

export const updateProduct = createAsyncThunk('seller/updateProduct', async ({ id, updates }) => {
  return await sellerApi.updateProduct(id, updates);
});

export const deleteProduct = createAsyncThunk('seller/deleteProduct', async (id) => {
  return await sellerApi.deleteProduct(id);
});

const sellerSlice = createSlice({
  name: 'seller',
  initialState: {
    products: [],
    stats: null,
    activity: [],
    loading: false,
    error: null,
    mode: 'user' // 'user' or 'seller'
  },
  reducers: {
    toggleMode: (state) => {
      state.mode = state.mode === 'user' ? 'seller' : 'user';
    },
    setMode: (state, action) => {
      state.mode = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Products
      .addCase(fetchSellerProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchSellerProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload || [];
      })
      .addCase(fetchSellerProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Stats
      .addCase(fetchSellerStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // Activity
      .addCase(fetchSellerActivity.fulfilled, (state, action) => {
        state.activity = action.payload || [];
      })
      // Create Product
      .addCase(createProduct.fulfilled, (state, action) => {
        state.products.push(action.payload);
      })
      // Update Product
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.products.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.products[index] = { ...state.products[index], ...action.payload };
        }
      })
      // Delete Product
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter(p => p.id !== action.payload.id);
      });
  },
});

export const { toggleMode, setMode } = sellerSlice.actions;
export default sellerSlice.reducer;
