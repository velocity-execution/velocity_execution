import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { marketApi } from '../api/marketApi';
import PriceChart from '../components/PriceChart';
import OrderBook from '../components/OrderBook';
import OrderForm from '../components/OrderForm';
import RecentTrades from '../components/RecentTrades';
import { TrendingUp, TrendingDown, Clock, BarChart2 } from 'lucide-react';

export default function Trade() {
  const { symbol = 'BTCUSDT' } = useParams();
  const [ticker, setTicker] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let interval;
    const fetchMarketData = async () => {
      try {
        const [tickerData, statsData] = await Promise.all([
          marketApi.getTicker(symbol),
          marketApi.getStats(symbol)
        ]);
        setTicker(tickerData);
        setStats(statsData);
      } catch (err) {
        console.error('Error fetching market data', err);
      }
    };

    fetchMarketData();
    interval = setInterval(fetchMarketData, 2000);
    return () => clearInterval(interval);
  }, [symbol]);

  const currentPrice = ticker?.price || stats?.price || 0;
  const change24h = stats?.change24h || 0;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* Ticker Info Bar */}
      <div className="flex items-center gap-6 px-4 py-3 bg-surface border-b border-border shrink-0 overflow-x-auto">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white whitespace-nowrap">{symbol.replace('_', '/')}</h1>
          <span className={`text-lg font-bold flex items-center gap-1 ${change24h >= 0 ? 'text-success' : 'text-danger'}`}>
             ${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </span>
        </div>

        <div className="h-8 w-px bg-border hidden md:block"></div>

        <div className="flex items-center gap-6 text-sm whitespace-nowrap">
          <div>
            <div className="text-gray-400 text-xs">24h Change</div>
            <div className={`font-medium ${change24h >= 0 ? 'text-success' : 'text-danger'}`}>
              {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">24h High</div>
            <div className="font-medium text-white">${stats?.high24h?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '---'}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">24h Low</div>
            <div className="font-medium text-white">${stats?.low24h?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '---'}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">24h Volume</div>
            <div className="font-medium text-white">{stats?.volume24h?.toLocaleString() || '---'}</div>
          </div>
        </div>
      </div>

      {/* Main Trading Area */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden p-2 grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        
        {/* Left Column: Chart */}
        <div className="lg:col-span-2 xl:col-span-3 flex flex-col min-h-[400px] lg:min-h-0 relative">
           <PriceChart symbol={symbol} />
        </div>

        {/* Middle Column: OrderBook & Form (Desktop) */}
        <div className="flex flex-col gap-2 min-h-[600px] lg:min-h-0">
          <div className="flex-1 min-h-[300px]">
            <OrderBook symbol={symbol} />
          </div>
          <div className="shrink-0">
            <OrderForm symbol={symbol} currentPrice={currentPrice} />
          </div>
        </div>

        {/* Right Column: Recent Trades */}
        <div className="flex flex-col min-h-[300px] lg:min-h-0">
          <RecentTrades symbol={symbol} />
        </div>

      </div>
    </div>
  );
}

