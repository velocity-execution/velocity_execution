import { configureStore } from '@reduxjs/toolkit';
import marketReducer from './marketSlice';
import walletReducer from './walletSlice';
import orderReducer from './orderSlice';
import sellerReducer from './sellerSlice';

export const store = configureStore({
  reducer: {
    market: marketReducer,
    wallet: walletReducer,
    order: orderReducer,
    seller: sellerReducer,
  },
});
