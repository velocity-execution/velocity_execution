import { useEffect, useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { marketApi } from '../api/marketApi';

export default function PriceChart({ symbol }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval;
    const fetchTradesForChart = async () => {
      try {
        // Fetch recent trades to build a simple line chart, as proper OHLC might not be available
        const trades = await marketApi.getTrades(symbol);
        if (trades && trades.length > 0) {
          // Sort chronologically for the chart
          const sorted = trades.sort((a, b) => new Date(a.time || a.created_at) - new Date(b.time || b.created_at));
          
          // Downsample or take last 60 points
          const points = sorted.slice(-60).map(t => ({
            time: new Date(t.time || t.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            price: t.price
          }));
          setData(points);
        }
      } catch (err) {
        console.error('Failed to fetch chart data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTradesForChart();
    interval = setInterval(fetchTradesForChart, 5000);
    return () => clearInterval(interval);
  }, [symbol]);

  const yDomain = useMemo(() => {
    if (data.length === 0) return ['auto', 'auto'];
    const min = Math.min(...data.map(d => d.price));
    const max = Math.max(...data.map(d => d.price));
    const padding = (max - min) * 0.1 || min * 0.01;
    return [Math.max(0, min - padding), max + padding];
  }, [data]);

  if (loading && data.length === 0) {
    return <div className="h-full w-full flex items-center justify-center text-gray-500">Loading Chart Data...</div>;
  }

  return (
    <div className="h-full w-full bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
      <div className="p-3 border-b border-border flex justify-between items-center bg-[#0f172a]/30">
        <h3 className="font-medium text-sm">Price Chart (Trades)</h3>
      </div>
      <div className="flex-1 p-2">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickMargin={10} minTickGap={30} />
              <YAxis domain={yDomain} stroke="#94a3b8" fontSize={10} orientation="right" tickFormatter={(val) => val.toFixed(2)} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                itemStyle={{ color: '#3b82f6' }}
              />
              <Area type="monotone" dataKey="price" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
