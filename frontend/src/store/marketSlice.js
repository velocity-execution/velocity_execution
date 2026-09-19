import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { marketApi } from '../api/marketApi';

export const fetchSymbols = createAsyncThunk('market/fetchSymbols', async () => {
  try {
    const res = await marketApi.getSymbols();
    const data = res?.data || res;
    const symbolsList = Array.isArray(data) && data.length > 0 ? data : [];

    const enriched = await Promise.all(
      symbolsList.map(async (item) => {
        const cleanSymbol = (item.symbol || '').replace('/', '').trim().toUpperCase();
        let price = Number(item.price || 0);
        let change24h = Number(item.change24h || 0);
        let high24h = item.high24h ? Number(item.high24h) : (price > 0 ? price : null);
        let low24h = item.low24h ? Number(item.low24h) : (price > 0 ? price : null);
        let volume24h = Number(item.volume24h || 0);

        // 1. Try local backend stats first
        try {
          const localStats = await marketApi.getStats(cleanSymbol);
          const s = localStats?.data || localStats;
          if (s && (Number(s.last_price || s.price || 0) > 0)) {
            price = Number(s.last_price || s.price || price);
            change24h = Number(s.change24h || change24h);
            high24h = Number(s.high_price || s.high24h || high24h);
            low24h = Number(s.low_price || s.low24h || low24h);
            volume24h = Number(s.quote_volume || s.volume24h || volume24h);
          }
        } catch {
          // Local stats not yet populated with trades
        }

        return {
          ...item,
          symbol: cleanSymbol,
          base_asset: item.base_asset || cleanSymbol.slice(0, -4),
          quote_asset: item.quote_asset || 'USDT',
          price,
          change24h,
          high24h,
          low24h,
          volume24h,
        };
      })
    );

    return enriched;
  } catch (err) {
    console.warn('Failed to fetch symbols:', err.message);
    return [];
  }
});

export const fetchOrderBook = createAsyncThunk('market/fetchOrderBook', async (symbol) => {
  try {
    const res = await marketApi.getOrderBook(symbol);
    return res?.data || res || { bids: [], asks: [] };
  } catch (err) {
    console.warn('Failed to fetch order book:', err.message);
    return { bids: [], asks: [] };
  }
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

