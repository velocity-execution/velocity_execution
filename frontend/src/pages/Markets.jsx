import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchSymbols } from '../store/marketSlice';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';

export default function Markets() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { symbols, loading, error } = useSelector(state => state.market);

  useEffect(() => {
    dispatch(fetchSymbols());
    // In a real app, this would poll or use WebSockets for live updates
    const interval = setInterval(() => {
      dispatch(fetchSymbols());
    }, 10000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleRowClick = (symbol) => {
    navigate(`/trade/${symbol}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Markets</h1>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search symbols..." 
            className="w-full bg-surface text-sm text-white rounded-md pl-9 pr-4 py-2 border border-border focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a]/50">
              <tr className="text-gray-400 border-b border-border">
                <th className="px-6 py-4 font-medium">Trading Pair</th>
                <th className="px-6 py-4 font-medium text-right">Last Price</th>
                <th className="px-6 py-4 font-medium text-right">24h Change</th>
                <th className="px-6 py-4 font-medium text-right">24h High</th>
                <th className="px-6 py-4 font-medium text-right">24h Low</th>
                <th className="px-6 py-4 font-medium text-right">24h Volume</th>
              </tr>
            </thead>
            <tbody>
              {loading && symbols.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Loading markets...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-danger">
                    Failed to load markets: {error}
                  </td>
                </tr>
              ) : symbols.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No trading pairs available
                  </td>
                </tr>
              ) : (
                symbols.map((s) => (
                  <tr 
                    key={s.symbol} 
                    onClick={() => handleRowClick(s.symbol)}
                    className="border-b border-border/50 hover:bg-border/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-medium group-hover:text-primary transition-colors">
                      {s.symbol.replace('_', '/')}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      ${(s.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td className={`px-6 py-4 text-right font-medium flex items-center justify-end gap-1 ${(s.change24h || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                      {(s.change24h || 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {Math.abs(s.change24h || 0).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">
                      ${s.high24h?.toLocaleString(undefined, {minimumFractionDigits: 2}) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">
                      ${s.low24h?.toLocaleString(undefined, {minimumFractionDigits: 2}) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">
                      ${(s.volume24h || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

