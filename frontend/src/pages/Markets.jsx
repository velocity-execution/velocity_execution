import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchSymbols } from '../store/marketSlice';
import { TrendingUp, TrendingDown, Search, ArrowUpRight, RefreshCw, Activity } from 'lucide-react';

export default function Markets() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { symbols, loading, error } = useSelector((state) => state.market);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchSymbols());
    const interval = setInterval(() => {
      dispatch(fetchSymbols());
    }, 10000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleRowClick = (symbol) => {
    navigate(`/trade/${symbol}`);
  };

  const filteredSymbols = (symbols || []).filter((s) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      s.symbol?.toLowerCase().includes(term) ||
      s.display_name?.toLowerCase().includes(term) ||
      s.base_asset?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Spot Markets</h1>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Data
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Real-time prices, 24h volume, and market depth</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product (CTG, VAL-RACK)..."
              className="w-full bg-surface text-sm text-white rounded-lg pl-9 pr-4 py-2 border border-border focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <button
            onClick={() => dispatch(fetchSymbols())}
            className="p-2 rounded-lg bg-surface border border-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors shrink-0"
            title="Refresh prices"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : ''} />
          </button>
        </div>
      </div>

      {/* Markets Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a]/70">
              <tr className="text-gray-400 border-b border-border text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Trading Pair</th>
                <th className="px-6 py-4 font-semibold text-right">Last Price</th>
                <th className="px-6 py-4 font-semibold text-right">24h Change</th>
                <th className="px-6 py-4 font-semibold text-right hidden sm:table-cell">24h High</th>
                <th className="px-6 py-4 font-semibold text-right hidden md:table-cell">24h Low</th>
                <th className="px-6 py-4 font-semibold text-right hidden lg:table-cell">24h Volume</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading && filteredSymbols.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin text-primary" />
                      <span>Loading active market rates...</span>
                    </div>
                  </td>
                </tr>
              ) : error && filteredSymbols.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-danger">
                    Failed to load markets: {error}
                  </td>
                </tr>
              ) : filteredSymbols.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                    No trading pairs found matching "{search}"
                  </td>
                </tr>
              ) : (
                filteredSymbols.map((s) => {
                  const isPositive = (s.change24h || 0) >= 0;
                  const displayName = s.display_name || s.symbol.replace('_', '/');
                  return (
                    <tr
                      key={s.symbol}
                      onClick={() => handleRowClick(s.symbol)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      {/* Pair */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="min-w-[68px] max-w-[92px] px-2.5 h-8 rounded-lg bg-[#0f172a] border border-border flex items-center justify-center font-bold text-[11px] text-primary font-mono shrink-0 truncate group-hover:border-primary/50 transition-colors shadow-inner">
                            {s.base_asset || s.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                              <span>{s.base_asset ? `${s.base_asset} / ${s.quote_asset || 'USDT'}` : s.symbol.replace('_', '/')}</span>
                            </div>
                            <div className="text-xs text-gray-400">{displayName}</div>
                          </div>
                        </div>
                      </td>

                      {/* Last Price */}
                      <td className="px-6 py-4 text-right font-mono font-bold text-white text-base">
                        ${(s.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 24h Change */}
                      <td className="px-6 py-4 text-right font-mono">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {isPositive ? '+' : ''}
                          {(s.change24h || 0).toFixed(2)}%
                        </span>
                      </td>

                      {/* 24h High */}
                      <td className="px-6 py-4 text-right font-mono text-gray-300 hidden sm:table-cell">
                        {s.high24h
                          ? `$${s.high24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : '---'}
                      </td>

                      {/* 24h Low */}
                      <td className="px-6 py-4 text-right font-mono text-gray-400 hidden md:table-cell">
                        {s.low24h
                          ? `$${s.low24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : '---'}
                      </td>

                      {/* 24h Volume */}
                      <td className="px-6 py-4 text-right font-mono text-gray-400 hidden lg:table-cell">
                        {s.volume24h
                          ? s.volume24h.toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : '0.00'}
                      </td>

                      {/* Trade Button */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(s.symbol);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-black font-semibold text-xs transition-all border border-primary/30 inline-flex items-center gap-1 shadow-sm"
                        >
                          <span>Trade</span>
                          <ArrowUpRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
