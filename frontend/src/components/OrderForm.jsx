import { useState, useEffect } from 'react';
import { orderApi } from '../api/orderApi';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWallets } from '../store/walletSlice';
import { fetchOpenOrders } from '../store/orderSlice';

export default function OrderForm({ symbol = 'CTGUSDT', currentPrice }) {
  const dispatch = useDispatch();
  const cleanSymbol = (symbol || 'CTGUSDT').replace('/', '').replace('_', '').toUpperCase();
  const baseAsset = cleanSymbol.endsWith('USDT') ? cleanSymbol.slice(0, -4) : cleanSymbol;
  const quoteAsset = 'USDT';

  const { balances } = useSelector(state => state.wallet);
  const balancesList = Array.isArray(balances) ? balances : [];

  const baseWallet = balancesList.find(b => b.asset?.toUpperCase() === baseAsset);
  const quoteWallet = balancesList.find(b => b.asset?.toUpperCase() === quoteAsset);

  const availableBase = Number(baseWallet?.available || 0);
  const availableQuote = Number(quoteWallet?.available || 0);

  const [side, setSide] = useState('buy');
  const [type, setType] = useState('limit');
  const [tif, setTif] = useState('GTC');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    dispatch(fetchWallets());
  }, [dispatch]);

  // Reset and sync limit price when symbol changes or when empty
  useEffect(() => {
    if (type === 'limit' && currentPrice) {
      setPrice(currentPrice.toString());
    }
  }, [symbol, currentPrice, type]);

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
      setError(`Insufficient ${baseAsset} balance. You currently hold ${availableBase} ${baseAsset}. You must hold ${baseAsset} tokens to place a SELL order.`);
      return;
    }

    if (side === 'buy' && type === 'limit') {
      const totalReq = parseFloat(price || 0) * qtyNum;
      if (totalReq > availableQuote) {
        setError(`Insufficient ${quoteAsset} balance. Required: $${totalReq.toFixed(2)}, Available: $${availableQuote.toFixed(2)}.`);
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

    const orderData = {
      symbol: (symbol || 'BTCUSDT').toUpperCase(),
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      time_in_force: (tif || 'GTC').toUpperCase(),
      quantity: Math.max(1, Math.round(parseFloat(quantity))),
      price: Math.round(parseFloat(price) || 0),
      stop_price: Math.round(parseFloat(stopPrice) || 0),
    };

    setLoading(true);
    try {
      await orderApi.createOrder(orderData);
      setSuccess(true);
      setQuantity('');
      dispatch(fetchWallets());
      dispatch(fetchOpenOrders());
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const total = (parseFloat(price || 0) * parseFloat(quantity || 0)).toFixed(2);

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex">
        <button 
          className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${side === 'buy' ? 'bg-success/20 text-success border-b-2 border-success' : 'text-gray-400 hover:text-white bg-[#0f172a]/50'}`}
          onClick={() => setSide('buy')}
        >
          Buy
        </button>
        <button 
          className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${side === 'sell' ? 'bg-danger/20 text-danger border-b-2 border-danger' : 'text-gray-400 hover:text-white bg-[#0f172a]/50'}`}
          onClick={() => setSide('sell')}
        >
          Sell
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-xs text-danger bg-danger/10 p-2 rounded border border-danger/20">{error}</div>}
          {success && <div className="text-xs text-success bg-success/10 p-2 rounded border border-success/20">Order placed successfully!</div>}

          {/* Available balance indicator */}
          <div className="flex justify-between items-center text-xs bg-[#0f172a]/60 px-3 py-2 rounded-lg border border-border/50">
            <span className="text-gray-400">Available:</span>
            <span className="font-mono font-bold text-white">
              {side === 'buy'
                ? `$${availableQuote.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${quoteAsset}`
                : `${availableBase.toLocaleString(undefined, { minimumFractionDigits: 4 })} ${baseAsset}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Type</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value)}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
              >
                <option value="limit">Limit</option>
                <option value="market">Market</option>
                <option value="stop_market">Stop Market</option>
                <option value="stop_limit">Stop Limit</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Time in force</label>
              <select 
                value={tif} 
                onChange={e => setTif(e.target.value)}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
              >
                <option value="GTC">GTC</option>
                <option value="IOC">IOC</option>
                <option value="FOK">FOK</option>
              </select>
            </div>
          </div>

          {(type === 'stop_market' || type === 'stop_limit') && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Stop Price</label>
              <div className="relative">
                <input 
                  type="number" step="any" min="0" value={stopPrice} onChange={e => setStopPrice(e.target.value)}
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
                  type="number" step="any" min="0" value={price} onChange={e => setPrice(e.target.value)}
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
                type="number" step="any" min="0" value={quantity} onChange={e => setQuantity(e.target.value)}
                className="w-full bg-background border border-border rounded px-2 py-1.5 pr-12 text-sm text-white focus:outline-none focus:border-primary"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{baseAsset}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <div className="flex justify-between items-center text-sm mb-4">
              <span className="text-gray-400">Total</span>
              <span className="font-medium">{type === 'market' ? '~' : ''}{total} USD</span>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-2.5 rounded font-bold uppercase transition-colors text-white ${side === 'buy' ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'} disabled:opacity-50`}
            >
              {loading ? 'Processing...' : `${side} ${baseAsset}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
