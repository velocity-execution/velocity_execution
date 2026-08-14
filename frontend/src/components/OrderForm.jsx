import { useState, useEffect } from 'react';
import { orderApi } from '../api/orderApi';
import { useDispatch } from 'react-redux';
import { fetchWallets } from '../store/walletSlice';
import { fetchOpenOrders } from '../store/orderSlice';

export default function OrderForm({ symbol, currentPrice }) {
  const dispatch = useDispatch();
  const [side, setSide] = useState('buy');
  const [type, setType] = useState('limit');
  const [tif, setTif] = useState('GTC');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Sync current price to limit price when it changes if empty
  useEffect(() => {
    if (type === 'limit' && !price && currentPrice) {
      setPrice(currentPrice.toString());
    }
  }, [currentPrice, type, price]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Invalid quantity');
      return;
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
      symbol,
      side,
      type,
      time_in_force: tif,
      quantity: parseFloat(quantity),
      price: parseFloat(price) || 0,
      stop_price: parseFloat(stopPrice) || 0,
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
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{symbol.split('_')[0]}</span>
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
              {loading ? 'Processing...' : `${side} ${symbol.split('_')[0]}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
