import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { walletApi } from '../api/walletApi';

export const fetchWallets = createAsyncThunk('wallet/fetchWallets', async () => {
  return await walletApi.getWallets();
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
      .addCase(fetchWallets.pending, (state) => { state.loading = true; })
      .addCase(fetchWallets.fulfilled, (state, action) => {
        state.loading = false;
        state.balances = action.payload;
      })
      .addCase(fetchWallets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default walletSlice.reducer;
