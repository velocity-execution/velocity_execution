import { useEffect, useState, useMemo } from 'react';
import { marketApi } from '../api/marketApi';

export default function OrderBook({ symbol }) {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval;
    const fetchOB = async () => {
      try {
        const data = await marketApi.getOrderBook(symbol);
        setOrderBook(data);
      } catch (err) {
        console.error('Failed to fetch order book', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOB();
    interval = setInterval(fetchOB, 2000); // Polling 2s
    return () => clearInterval(interval);
  }, [symbol]);

  // Sort and calculate cumulative
  const asks = useMemo(() => {
    if (!orderBook?.asks) return [];
    let acc = 0;
    return [...orderBook.asks]
      .sort((a, b) => b.price - a.price) // Descending for display (highest ask top)
      .slice(-15) // take top 15 nearest to price
      .map(ask => {
        acc += ask.quantity;
        return { ...ask, total: acc };
      });
  }, [orderBook?.asks]);

  const bids = useMemo(() => {
    if (!orderBook?.bids) return [];
    let acc = 0;
    return [...orderBook.bids]
      .sort((a, b) => b.price - a.price) // Descending for display (highest bid top)
      .slice(0, 15)
      .map(bid => {
        acc += bid.quantity;
        return { ...bid, total: acc };
      });
  }, [orderBook?.bids]);

  const maxTotal = Math.max(
    (asks.length > 0 ? asks[0].total : 0),
    (bids.length > 0 ? bids[bids.length - 1].total : 0)
  );

  if (loading && asks.length === 0 && bids.length === 0) {
    return <div className="h-full flex items-center justify-center text-gray-500 text-sm">Loading Order Book...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-lg overflow-hidden">
      <div className="p-3 border-b border-border bg-[#0f172a]/30">
        <h3 className="font-medium text-sm">Order Book</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-1">
        <div className="grid grid-cols-3 text-xs text-gray-400 px-2 py-1 mb-1">
          <div>Price</div>
          <div className="text-right">Quantity</div>
          <div className="text-right">Total</div>
        </div>

        {/* Asks (Sell) */}
        <div className="flex flex-col mb-2">
          {asks.map((ask, i) => {
            const depth = maxTotal > 0 ? (ask.total / maxTotal) * 100 : 0;
            return (
              <div key={i} className="grid grid-cols-3 text-xs px-2 py-0.5 relative group hover:bg-border/30 cursor-pointer">
                <div className="absolute top-0 right-0 h-full bg-danger/10 -z-10 transition-all" style={{ width: `${depth}%` }}></div>
                <div className="text-danger font-medium">{ask.price.toFixed(2)}</div>
                <div className="text-right text-gray-300">{ask.quantity.toFixed(4)}</div>
                <div className="text-right text-gray-400">{ask.total.toFixed(4)}</div>
              </div>
            );
          })}
        </div>

        {/* Spread / Current Price Indicator */}
        <div className="py-2 px-2 flex items-center justify-between border-y border-border/50 bg-[#0f172a]/20">
          <span className="text-lg font-bold text-success">
             {asks.length > 0 && bids.length > 0 
                ? ((asks[asks.length-1].price + bids[0].price)/2).toFixed(2) 
                : '---'}
          </span>
          <span className="text-xs text-gray-400 uppercase">Spread</span>
        </div>

        {/* Bids (Buy) */}
        <div className="flex flex-col mt-2">
          {bids.map((bid, i) => {
            const depth = maxTotal > 0 ? (bid.total / maxTotal) * 100 : 0;
            return (
              <div key={i} className="grid grid-cols-3 text-xs px-2 py-0.5 relative group hover:bg-border/30 cursor-pointer">
                <div className="absolute top-0 right-0 h-full bg-success/10 -z-10 transition-all" style={{ width: `${depth}%` }}></div>
                <div className="text-success font-medium">{bid.price.toFixed(2)}</div>
                <div className="text-right text-gray-300">{bid.quantity.toFixed(4)}</div>
                <div className="text-right text-gray-400">{bid.total.toFixed(4)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
