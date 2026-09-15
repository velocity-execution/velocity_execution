import { useEffect, useState } from 'react';
import { marketApi } from '../api/marketApi';
import { marketWs } from '../services/marketWs';
import { X } from 'lucide-react';

export default function RecentTrades({ symbol = 'BTCUSDT', onClose }) {
  const cleanSymbol = symbol.replace('/', '').trim().toUpperCase();
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial fetch from Velocity backend
    const loadTrades = async () => {
      try {
        const res = await marketApi.getTrades(cleanSymbol);
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        if (isMounted && list && list.length > 0) {
          const sorted = [...list].sort(
            (a, b) => new Date(b.time || b.executed_at || b.created_at || 0) - new Date(a.time || a.executed_at || a.created_at || 0)
          );
          setTrades(sorted.slice(0, 40));
        }
      } catch (err) {
        console.warn('[RecentTrades] Error loading trades:', err);
      }
    };

    loadTrades();

    // 2. Real-time WebSocket subscription for instant trade executions
    const unsubscribe = marketWs.subscribe(cleanSymbol, (msg) => {
      if (msg.type === 'trade' && msg.data) {
        const t = msg.data;
        const newTrade = {
          id: t.trade_id || Date.now(),
          price: Number(t.price),
          quantity: Number(t.quantity),
          buyer_id: t.buyer_id,
          seller_id: t.seller_id,
          time: new Date().toISOString(),
          side: t.side || 'buy',
        };
        setTrades((prev) => [newTrade, ...prev.slice(0, 39)]);
      }
    });

    // Fallback poll every 4s to catch any trades
    const pollInterval = setInterval(loadTrades, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [cleanSymbol]);

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-lg overflow-hidden shadow-xl">
      <div className="p-3 border-b border-border bg-[#0f172a]/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-xs text-white uppercase tracking-wider">Recent Trades</h3>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Velocity Engine
          </span>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title="Close Recent Trades"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-3 px-3 py-1.5 text-[11px] text-gray-400 border-b border-border/40 font-medium shrink-0 bg-[#0f172a]/40">
        <span>Price (USDT)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Time</span>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {trades.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs p-4 text-center">
            <span>No trades executed yet on Velocity</span>
            <span className="text-[10px] text-gray-600 mt-1">Place an order to see live executions</span>
          </div>
        ) : (
          trades.map((t, idx) => {
            const isBuy = t.side ? t.side.toLowerCase() === 'buy' : true;
            const timeStr = t.time ? new Date(t.time).toLocaleTimeString([], { hour12: false }) : '--:--:--';

            return (
              <div
                key={t.id || idx}
                className="grid grid-cols-3 px-3 py-1 hover:bg-white/[0.02] transition-colors text-[11px] items-center"
              >
                <span className={isBuy ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                  ${Number(t.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-right text-gray-300 font-mono">
                  {Number(t.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
                <span className="text-right text-gray-500 text-[10px]">
                  {timeStr}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
