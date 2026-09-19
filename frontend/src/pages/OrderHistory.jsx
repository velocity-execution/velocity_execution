import { useEffect, useState } from 'react';
import { orderApi } from '../api/orderApi';
import { Filter, RefreshCw, AlertCircle, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const formatSymbol = (sym) => {
  if (!sym) return '';
  if (sym.includes('/') || sym.includes('_')) return sym.replace('_', '/');
  if (sym.endsWith('USDT')) return `${sym.slice(0, -4)}/USDT`;
  if (sym.endsWith('BTC')) return `${sym.slice(0, -3)}/BTC`;
  return sym;
};

export default function OrderHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterSide, setFilterSide] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await orderApi.getOrderHistory();
      const data = res?.data !== undefined ? res.data : res;
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load order history');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = (Array.isArray(history) ? history : []).filter(order => {
    if (filterSymbol && !order.symbol?.toLowerCase().includes(filterSymbol.toLowerCase())) return false;
    if (filterSide && order.side?.toUpperCase() !== filterSide.toUpperCase()) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Order History
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {filteredHistory.length} Records
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Audit log of all filled, cancelled, and past orders</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#0f172a] hover:bg-[#1e293b] text-gray-200 border border-[#1e293b] rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-gray-400'} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            to="/orders/open"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-surface hover:bg-border text-gray-200 border border-border rounded-lg transition-all"
          >
            <span>View Open Orders</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <Filter size={16} /> <span className="text-sm font-medium">Filters:</span>
        </div>
        <input 
          type="text"
          placeholder="Filter by Symbol (e.g. BTC)"
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          className="bg-[#0f172a] border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary focus:outline-none transition-colors w-48"
        />
        <select 
          value={filterSide}
          onChange={(e) => setFilterSide(e.target.value)}
          className="bg-[#0f172a] border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary focus:outline-none transition-colors"
        >
          <option value="">All Sides</option>
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </select>
        {(filterSymbol || filterSide) && (
          <button
            onClick={() => { setFilterSymbol(''); setFilterSide(''); }}
            className="text-xs text-primary hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a]/80 border-b border-border">
              <tr className="text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-3.5 font-semibold">Date & Time</th>
                <th className="px-6 py-3.5 font-semibold">Pair</th>
                <th className="px-6 py-3.5 font-semibold">Side</th>
                <th className="px-6 py-3.5 font-semibold">Type</th>
                <th className="px-6 py-3.5 font-semibold text-right">Price</th>
                <th className="px-6 py-3.5 font-semibold text-right">Amount</th>
                <th className="px-6 py-3.5 font-semibold text-right">Filled</th>
                <th className="px-6 py-3.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-primary" />
                      <span>Loading order history...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-danger">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={24} />
                      <span className="font-medium">{error}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No order history found matching filters
                  </td>
                </tr>
              ) : (
                filteredHistory.map(order => {
                  const isBuy = order.side?.toUpperCase() === 'BUY';
                  const statusUpper = (order.status || '').toUpperCase();
                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-gray-400 text-xs font-mono whitespace-nowrap">
                        {new Date(order.created_at || Date.now()).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })} IST
                      </td>
                      <td className="px-6 py-4 font-bold text-white whitespace-nowrap">
                        {formatSymbol(order.symbol)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                          isBuy 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {isBuy ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {order.side}
                        </span>
                      </td>
                      <td className="px-6 py-4 uppercase text-xs font-medium text-gray-300">
                        {order.type || 'LIMIT'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-white">
                        ${Number(order.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-200">
                        {order.quantity}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-400">
                        {order.filled !== undefined ? order.filled : (order.filled_quantity || 0)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${
                          statusUpper === 'FILLED' 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                            : statusUpper === 'CANCELLED' 
                            ? 'bg-gray-500/15 text-gray-400 border-gray-500/30' 
                            : statusUpper === 'REJECTED'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-primary/20 text-primary border-primary/30'
                        }`}>
                          {statusUpper || 'UNKNOWN'}
                        </span>
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

