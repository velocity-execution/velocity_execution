import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderApi } from '../api/orderApi';

export const fetchOpenOrders = createAsyncThunk('order/fetchOpenOrders', async (_, { rejectWithValue }) => {
  try {
    const res = await orderApi.getOpenOrders();
    const data = res?.data !== undefined ? res.data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Failed to fetch open orders:', err.message);
    return rejectWithValue(err.message || 'Failed to fetch open orders');
  }
});

export const fetchOrderHistory = createAsyncThunk('order/fetchOrderHistory', async (_, { rejectWithValue }) => {
  try {
    const res = await orderApi.getOrderHistory();
    const data = res?.data !== undefined ? res.data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Failed to fetch order history:', err.message);
    return rejectWithValue(err.message || 'Failed to fetch order history');
  }
});

const orderSlice = createSlice({
  name: 'order',
  initialState: {
    openOrders: [],
    history: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOpenOrders.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOpenOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.openOrders = action.payload || [];
      })
      .addCase(fetchOpenOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
        state.openOrders = [];
      })
      .addCase(fetchOrderHistory.fulfilled, (state, action) => {
        state.history = action.payload || [];
      });
  },
});

export default orderSlice.reducer;
