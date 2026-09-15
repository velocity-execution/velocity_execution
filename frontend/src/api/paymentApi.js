import { apiClient } from './client';

export const paymentApi = {
  // Create Razorpay Order
  createOrder: (amount) => apiClient.post('/payments/razorpay/create-order', { amount }),

  // Verify Razorpay Payment
  verifyPayment: ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) =>
    apiClient.post('/payments/razorpay/verify', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),

  // Withdraw cash to Bank Account or UPI VPA
  withdrawCash: ({ amount, account_type, account_number, ifsc, vpa, name }) =>
    apiClient.post('/wallets/withdraw-cash', {
      amount,
      account_type,
      account_number,
      ifsc,
      vpa,
      name,
    }),

  // Fetch transaction history
  getTransactions: (params = {}) => apiClient.get('/payments/transactions', { params }),
};
