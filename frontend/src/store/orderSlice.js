import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderApi } from '../api/orderApi';

export const fetchOpenOrders = createAsyncThunk('order/fetchOpenOrders', async () => {
  return await orderApi.getOpenOrders();
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
      .addCase(fetchOpenOrders.pending, (state) => { state.loading = true; })
      .addCase(fetchOpenOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.openOrders = action.payload;
      })
      .addCase(fetchOpenOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default orderSlice.reducer;
