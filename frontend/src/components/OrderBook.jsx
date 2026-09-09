import { useEffect, useState, useMemo } from 'react';
import { marketApi } from '../api/marketApi';
import { marketWs } from '../services/marketWs';

export default function OrderBook({ symbol = 'BTCUSDT', currentPrice, onToggleTrades }) {
  const cleanSymbol = symbol.replace('/', '').replace('_', '').toUpperCase();
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchOB = async () => {
      try {
        const res = await marketApi.getOrderBook(cleanSymbol);
        const data = res?.data !== undefined ? res.data : res;
        if (isMounted && data && (Array.isArray(data.bids) || Array.isArray(data.asks))) {
          setOrderBook({
            symbol: cleanSymbol,
            bids: data.bids || [],
            asks: data.asks || [],
          });
        }
      } catch (err) {
        console.warn('[OrderBook] Error fetching order book:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOB();

    // Real-time WebSocket Depth Updates from Velocity Engine
    const unsubscribe = marketWs.subscribe(cleanSymbol, (msg) => {
      if (msg.type === 'depth' && msg.data) {
        setOrderBook({
          symbol: cleanSymbol,
          bids: msg.data.bids || [],
          asks: msg.data.asks || [],
        });
      }
    });

    const interval = setInterval(fetchOB, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [cleanSymbol]);

  // Sort and calculate cumulative
  const asks = useMemo(() => {
    if (!Array.isArray(orderBook?.asks)) return [];
    let acc = 0;
    return [...orderBook.asks]
      .sort((a, b) => Number(b.price || 0) - Number(a.price || 0)) // Descending for display
      .slice(-12)
      .map(ask => {
        const qty = Number(ask.quantity || 0);
        acc += qty;
        return { ...ask, price: Number(ask.price || 0), quantity: qty, total: acc };
      });
  }, [orderBook?.asks]);

  const bids = useMemo(() => {
    if (!Array.isArray(orderBook?.bids)) return [];
    let acc = 0;
    return [...orderBook.bids]
      .sort((a, b) => Number(b.price || 0) - Number(a.price || 0)) // Descending for display
      .slice(0, 12)
      .map(bid => {
        const qty = Number(bid.quantity || 0);
        acc += qty;
        return { ...bid, price: Number(bid.price || 0), quantity: qty, total: acc };
      });
  }, [orderBook?.bids]);

  const maxTotal = Math.max(
    (asks.length > 0 ? asks[0].total : 0),
    (bids.length > 0 ? bids[bids.length - 1].total : 0),
    1
  );

  const spread = useMemo(() => {
    if (asks.length > 0 && bids.length > 0) {
      const lowestAsk = asks[asks.length - 1].price;
      const highestBid = bids[0].price;
      const diff = Math.abs(lowestAsk - highestBid);
      return diff.toFixed(2);
    }
    return '---';
  }, [asks, bids]);

  const midPrice = useMemo(() => {
    if (asks.length > 0 && bids.length > 0) {
      return ((asks[asks.length - 1].price + bids[0].price) / 2).toFixed(2);
    }
    return currentPrice ? Number(currentPrice).toFixed(2) : '---';
  }, [asks, bids, currentPrice]);

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-lg overflow-hidden">
      <div className="p-3 border-b border-border bg-[#0f172a]/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-xs text-white uppercase tracking-wider">Order Book</h3>
          <span className="text-[10px] text-emerald-400 font-mono">Real-time</span>
        </div>
        {onToggleTrades && (
          <button
            onClick={onToggleTrades}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded border border-primary/30 transition-colors flex items-center gap-1"
            title="Toggle Recent Trades feed"
          >
            <span>Trades ▾</span>
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col justify-between">
        <div>
          <div className="grid grid-cols-3 text-[11px] text-gray-400 px-2 py-1 border-b border-border/40 font-medium">
            <div>Price (USDT)</div>
            <div className="text-right">Size</div>
            <div className="text-right">Total</div>
          </div>

          {/* Asks (Sell Orders - Red) */}
          <div className="flex flex-col space-y-0.5 py-1">
            {asks.map((ask, i) => {
              const depth = (ask.total / maxTotal) * 100;
              return (
                <div key={i} className="grid grid-cols-3 text-xs px-2 py-0.5 relative group hover:bg-border/30 cursor-pointer font-mono">
                  <div className="absolute top-0 right-0 h-full bg-rose-500/15 -z-10 transition-all pointer-events-none" style={{ width: `${depth}%` }}></div>
                  <div className="text-rose-400 font-semibold">{ask.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-right text-gray-300">{ask.quantity.toFixed(4)}</div>
                  <div className="text-right text-gray-400">{ask.total.toFixed(4)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mid-Market Price & Spread Indicator */}
        <div className="py-2 px-3 my-1 flex items-center justify-between border-y border-border/60 bg-[#0f172a]/60">
          <span className="text-base font-bold text-emerald-400 font-mono">
            ${Number(midPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
            Spread: <span className="text-white font-medium">${spread}</span>
          </div>
        </div>

        {/* Bids (Buy Orders - Green) */}
        <div className="flex flex-col space-y-0.5 py-1">
          {bids.map((bid, i) => {
            const depth = (bid.total / maxTotal) * 100;
            return (
              <div key={i} className="grid grid-cols-3 text-xs px-2 py-0.5 relative group hover:bg-border/30 cursor-pointer font-mono">
                <div className="absolute top-0 right-0 h-full bg-emerald-500/15 -z-10 transition-all pointer-events-none" style={{ width: `${depth}%` }}></div>
                <div className="text-emerald-400 font-semibold">{bid.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
