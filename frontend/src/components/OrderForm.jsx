import { useState, useEffect } from 'react';
import { orderApi } from '../api/orderApi';
import { walletApi } from '../api/walletApi';
import { paymentApi } from '../api/paymentApi';
import { openRazorpayCheckout } from '../utils/razorpay';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWallets } from '../store/walletSlice';
import { fetchOpenOrders } from '../store/orderSlice';
import { ArrowDownToLine, Zap, RefreshCw, AlertCircle } from 'lucide-react';

export default function OrderForm({ symbol = 'CTGUSDT', currentPrice }) {
  const dispatch = useDispatch();
  const cleanSymbol = (symbol || 'CTGUSDT').replace('/', '').trim().toUpperCase();
  const baseAsset = cleanSymbol.endsWith('_USDT')
    ? cleanSymbol.slice(0, -5)
    : (cleanSymbol.endsWith('USDT') ? cleanSymbol.slice(0, -4) : cleanSymbol);
  const quoteAsset = 'USDT';

  const { balances } = useSelector((state) => state.wallet);
  const balancesList = Array.isArray(balances) ? balances : [];

  const baseWallet = balancesList.find((b) => b.asset?.toUpperCase() === baseAsset);
  const quoteWallet = balancesList.find((b) => b.asset?.toUpperCase() === quoteAsset);
  const inrWallet = balancesList.find((b) => b.asset?.toUpperCase() === 'INR');

  const availableBase = Number(baseWallet?.available || 0);
  const availableQuote = Number(quoteWallet?.available || 0);
  const availableINR = Number(inrWallet?.available || 0);

  const [side, setSide] = useState('buy');
  const [type, setType] = useState('limit');
  const [tif, setTif] = useState('GTC');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [stopPrice, setStopPrice] = useState('');

  const [loading, setLoading] = useState(false);
  const [inlineLoading, setInlineLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    dispatch(fetchWallets());
  }, [dispatch]);

  // Reset and sync limit price when symbol changes or when empty
  useEffect(() => {
    if (type === 'limit' && currentPrice) {
      setPrice(currentPrice.toString());
    }
  }, [symbol, currentPrice, type]);

  const effPrice = parseFloat(price || currentPrice || 0);
  const effQty = parseFloat(quantity || 0);
  const totalCost = effPrice * effQty;

  // Deficit calculation for Buy orders
  const isDeficit = side === 'buy' && totalCost > 0 && totalCost > availableQuote;
  const deficitAmount = isDeficit ? Math.ceil(totalCost - availableQuote) : 0;

  const buildOrderData = () => ({
    symbol: (symbol || 'BTCUSDT').toUpperCase(),
    side: side.toUpperCase(),
    type: type.toUpperCase(),
    time_in_force: (tif || 'GTC').toUpperCase(),
    quantity: Math.max(1, Math.round(parseFloat(quantity))),
    price: Math.round(parseFloat(price) || 0),
    stop_price: Math.round(parseFloat(stopPrice) || 0),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const qtyNum = parseFloat(quantity);
    if (!quantity || qtyNum <= 0) {
      setError('Invalid quantity');
      return;
    }

    if (side === 'sell' && qtyNum > availableBase) {
      setError(
        `Insufficient ${baseAsset} balance. You hold ${availableBase} ${baseAsset}. You must hold tokens to place a SELL order.`
      );
      return;
    }

    if (side === 'buy' && (type === 'limit' || type === 'market')) {
      const totalReq = (parseFloat(price || currentPrice || 0)) * qtyNum;
      if (totalReq > availableQuote) {
        setError(
          `Insufficient ${quoteAsset} balance. Required: $${totalReq.toFixed(2)}, Available: $${availableQuote.toFixed(2)}. Use the button below to add funds with Razorpay.`
        );
        return;
      }
    }

    if ((type === 'limit' || type === 'stop_limit') && (!price || parseFloat(price) <= 0)) {
      setError('Invalid price');
      return;
    }

    if ((type === 'stop_market' || type === 'stop_limit') && (!stopPrice || parseFloat(stopPrice) <= 0)) {
      setError('Invalid stop price');
      return;
    }

    setLoading(true);
    try {
      await orderApi.createOrder(buildOrderData());
      setSuccess(true);
      setSuccessMsg(`Successfully placed ${side.toUpperCase()} order!`);
      setQuantity('');
      dispatch(fetchWallets());
      dispatch(fetchOpenOrders());
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // Inline "Add Deficit via Razorpay & Place Order"
  const handleInlineTopupAndTrade = async () => {
    setError(null);
    setSuccess(false);

    const qtyNum = parseFloat(quantity);
    if (!quantity || qtyNum <= 0) {
      setError('Please enter a valid quantity first.');
      return;
    }

    setInlineLoading(true);
    try {
      // 1. Create Razorpay order for deficit amount
      const orderRes = await paymentApi.createOrder(deficitAmount);
      const orderData = orderRes?.data || orderRes;

      if (!orderData?.order_id) {
        throw new Error('Failed to create Razorpay payment order.');
      }

      // 2. Open Razorpay Checkout popup
      await openRazorpayCheckout({
        orderId: orderData.order_id,
        amount: orderData.amount,
        keyId: orderData.key_id,
        onSuccess: async (rzpResponse) => {
          try {
            // 3. Verify payment signature
            await paymentApi.verifyPayment({
              razorpay_order_id: rzpResponse.razorpay_order_id,
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_signature: rzpResponse.razorpay_signature,
            });

            // 4. Credit the trading asset balance (USDT) so the matching engine can lock it
            await walletApi.deposit({ asset: quoteAsset, amount: deficitAmount });

            // 5. Automatically place the user's trade order
            await orderApi.createOrder(buildOrderData());

            setSuccess(true);
            setSuccessMsg(`Added ₹${deficitAmount.toLocaleString()} via Razorpay & placed your BUY order!`);
            setQuantity('');
            dispatch(fetchWallets());
            dispatch(fetchOpenOrders());
            setTimeout(() => setSuccess(false), 4500);
          } catch (execErr) {
            setError(execErr.message || 'Payment verified but failed to place order.');
            dispatch(fetchWallets());
          } finally {
            setInlineLoading(false);
          }
        },
        onFailure: (err) => {
          setError(err.description || err.message || 'Razorpay payment was cancelled.');
          setInlineLoading(false);
        },
        onDismiss: () => {
          setInlineLoading(false);
        },
      });
    } catch (err) {
      setError(err.message || 'Failed to start Razorpay payment.');
      setInlineLoading(false);
    }
  };

  const total = totalCost.toFixed(2);

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex">
        <button
          className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${
            side === 'buy'
              ? 'bg-success/20 text-success border-b-2 border-success'
              : 'text-gray-400 hover:text-white bg-[#0f172a]/50'
          }`}
          onClick={() => setSide('buy')}
        >
          Buy
        </button>
        <button
          className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${
            side === 'sell'
              ? 'bg-danger/20 text-danger border-b-2 border-danger'
              : 'text-gray-400 hover:text-white bg-[#0f172a]/50'
          }`}
          onClick={() => setSide('sell')}
        >
          Sell
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-danger/10 border border-danger/50 text-danger text-xs p-2.5 rounded flex items-start gap-1.5">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-success/10 border border-success/50 text-success text-xs p-2.5 rounded font-medium">
              {successMsg || 'Order placed successfully!'}
            </div>
          )}

          <div className="flex gap-2">
            {['limit', 'market', 'stop_limit', 'stop_market'].map((t) => (
              <button
                key={t}
                type="button"
                className={`text-xs px-2 py-1 rounded capitalize transition-colors ${
                  type === t ? 'bg-border text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setType(t)}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Available {side === 'buy' ? quoteAsset : baseAsset}:</span>
            <span className="text-white font-medium">
              {side === 'buy' ? availableQuote.toLocaleString() : availableBase.toLocaleString()} {side === 'buy' ? quoteAsset : baseAsset}
            </span>
          </div>

          {(type === 'stop_limit' || type === 'stop_market') && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Stop Price</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 pr-12 text-sm text-white focus:outline-none focus:border-primary"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">USD</span>
              </div>
            </div>
          )}

          {(type === 'limit' || type === 'stop_limit') && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Price</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 pr-12 text-sm text-white focus:outline-none focus:border-primary"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">USD</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Quantity</label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-background border border-border rounded px-2 py-1.5 pr-12 text-sm text-white focus:outline-none focus:border-primary"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{baseAsset}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <div className="flex justify-between items-center text-sm mb-3">
              <span className="text-gray-400">Total</span>
              <span className="font-bold text-white">
                {type === 'market' ? '~' : ''}
                {total} USD
              </span>
            </div>

            {/* INLINE DEFICIT TOP-UP NOTICE & BUTTON */}
            {isDeficit ? (
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Short by ₹{deficitAmount.toLocaleString()}</span>
                    <span>Razorpay UPI</span>
                  </div>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    Add the required ₹{deficitAmount.toLocaleString()} to complete this trade instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleInlineTopupAndTrade}
                  disabled={inlineLoading}
                  className="w-full py-2.5 rounded-lg font-bold transition-all text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 text-xs"
                >
                  {inlineLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Processing Payment & Order...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} className="text-amber-300" />
                      <span>Add ₹{deficitAmount.toLocaleString()} & Buy {baseAsset}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 rounded-lg font-bold uppercase transition-colors text-white ${
                  side === 'buy' ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'
                } disabled:opacity-50 text-sm`}
              >
                {loading ? 'Processing...' : `${side} ${baseAsset}`}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
