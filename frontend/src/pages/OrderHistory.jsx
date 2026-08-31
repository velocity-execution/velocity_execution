import { useEffect, useState } from 'react';
import { orderApi } from '../api/orderApi';
import { Filter } from 'lucide-react';

export default function OrderHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterSide, setFilterSide] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await orderApi.getOrderHistory();
        setHistory(data);
      } catch (err) {
        setError(err.message || 'Failed to load order history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(order => {
    if (filterSymbol && !order.symbol.toLowerCase().includes(filterSymbol.toLowerCase())) return false;
    if (filterSide && order.side !== filterSide) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Order History</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-surface p-4 rounded-lg border border-border">
        <div className="flex items-center gap-2 text-gray-400">
          <Filter size={16} /> <span className="text-sm font-medium">Filters:</span>
        </div>
        <input 
          type="text"
          placeholder="Symbol (e.g. BTCUSDT)"
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          className="bg-background border border-border rounded px-3 py-1.5 text-sm text-white focus:border-primary focus:outline-none transition-colors"
        />
        <select 
          value={filterSide}
          onChange={(e) => setFilterSide(e.target.value)}
          className="bg-background border border-border rounded px-3 py-1.5 text-sm text-white focus:border-primary focus:outline-none transition-colors"
        >
          <option value="">All Sides</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a]/50">
              <tr className="text-gray-400 border-b border-border">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Pair</th>
                <th className="px-6 py-4 font-medium">Side</th>
                <th className="px-6 py-4 font-medium text-right">Price</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium text-right">Filled</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading history...</td></tr>
              ) : error ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-danger">{error}</td></tr>
              ) : filteredHistory.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No order history found</td></tr>
              ) : (
                filteredHistory.map(order => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                    <td className="px-6 py-4 text-gray-300 whitespace-nowrap">
                      {new Date(order.created_at || Date.now()).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium">{order.symbol.replace('_', '/')}</td>
                    <td className={`px-6 py-4 font-bold uppercase ${order.side === 'buy' ? 'text-success' : 'text-danger'}`}>
                      {order.side}
                    </td>
                    <td className="px-6 py-4 text-right">${order.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-6 py-4 text-right">{order.quantity}</td>
                    <td className="px-6 py-4 text-right text-gray-400">{order.filled_quantity || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                        order.status === 'filled' ? 'bg-success/20 text-success' : 
                        order.status === 'cancelled' ? 'bg-gray-500/20 text-gray-400' : 
                        'bg-primary/20 text-primary'
                      }`}>
                        {order.status || 'unknown'}
                      </span>
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

