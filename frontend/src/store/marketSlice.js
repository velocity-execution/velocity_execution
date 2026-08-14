import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { marketApi } from '../api/marketApi';

export const fetchSymbols = createAsyncThunk('market/fetchSymbols', async () => {
  return await marketApi.getSymbols();
});

export const fetchOrderBook = createAsyncThunk('market/fetchOrderBook', async (symbol) => {
  return await marketApi.getOrderBook(symbol);
});

const marketSlice = createSlice({
  name: 'market',
  initialState: {
    symbols: [],
    currentSymbol: null,
    orderBook: { bids: [], asks: [] },
    loading: false,
    error: null,
  },
  reducers: {
    setCurrentSymbol: (state, action) => {
      state.currentSymbol = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSymbols.pending, (state) => { state.loading = true; })
      .addCase(fetchSymbols.fulfilled, (state, action) => {
        state.loading = false;
        state.symbols = action.payload;
      })
      .addCase(fetchSymbols.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchOrderBook.fulfilled, (state, action) => {
        state.orderBook = action.payload;
      });
  },
});

export const { setCurrentSymbol } = marketSlice.actions;
export default marketSlice.reducer;

