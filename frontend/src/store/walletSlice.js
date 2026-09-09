import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { walletApi } from '../api/walletApi';

export const fetchWallets = createAsyncThunk('wallet/fetchWallets', async () => {
  try {
    const res = await walletApi.getWallets();
    const data = res?.data !== undefined ? res.data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Failed to fetch wallets:', err.message);
    return [];
  }
});

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    balances: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallets.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchWallets.fulfilled, (state, action) => {
        state.loading = false;
        state.balances = action.payload || [];
      })
      .addCase(fetchWallets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        state.balances = [];
      });
  },
});

export default walletSlice.reducer;
