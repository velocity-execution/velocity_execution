import { useEffect, useState } from 'react';
import { marketApi } from '../api/marketApi';

export default function RecentTrades({ symbol }) {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    let interval;
    const fetchTrades = async () => {
      try {
        const data = await marketApi.getTrades(symbol);
        // Ensure newest is first
        const sorted = (data || []).sort((a, b) => new Date(b.time || b.created_at) - new Date(a.time || a.created_at));
        setTrades(sorted.slice(0, 50));
      } catch (err) {
        console.error('Failed to fetch trades', err);
      }
    };

    fetchTrades();
    interval = setInterval(fetchTrades, 2000);
    return () => clearInterval(interval);
  }, [symbol]);

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-lg overflow-hidden">
      <div className="p-3 border-b border-border bg-[#0f172a]/30">
        <h3 className="font-medium text-sm">Recent Trades</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-1">
        <div className="grid grid-cols-3 text-xs text-gray-400 px-2 py-1 mb-1">
          <div>Price</div>
          <div className="text-right">Quantity</div>
          <div className="text-right">Time</div>
        </div>

        <div className="flex flex-col">
          {trades.map((trade, i) => (
            <div key={i} className="grid grid-cols-3 text-xs px-2 py-1 hover:bg-border/30 cursor-pointer">
              <div className={`font-medium ${trade.side === 'buy' ? 'text-success' : 'text-danger'}`}>
                {trade.price.toFixed(2)}
              </div>
              <div className="text-right text-gray-300">{trade.quantity.toFixed(4)}</div>
              <div className="text-right text-gray-500">
                {new Date(trade.time || trade.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          ))}
          {trades.length === 0 && (
            <div className="text-center text-xs text-gray-500 py-4">No recent trades</div>
          )}
        </div>
      </div>
    </div>
  );
}
