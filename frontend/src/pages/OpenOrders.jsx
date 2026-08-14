import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOpenOrders } from '../store/orderSlice';
import { orderApi } from '../api/orderApi';
import { fetchWallets } from '../store/walletSlice';

export default function OpenOrders() {
  const dispatch = useDispatch();
  const { openOrders, loading, error } = useSelector(state => state.order);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    dispatch(fetchOpenOrders());
  }, [dispatch]);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    setCancelling(id);
    try {
      await orderApi.cancelOrder(id);
      dispatch(fetchOpenOrders());
      dispatch(fetchWallets()); // Update wallet in case locked balance is freed
    } catch (err) {
      alert(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Open Orders</h1>

      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a]/50">
              <tr className="text-gray-400 border-b border-border">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Pair</th>
                <th className="px-6 py-4 font-medium">Side</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium text-right">Price</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && openOrders.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">Loading open orders...</td></tr>
              ) : error ? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-danger">Failed to load orders: {error}</td></tr>
              ) : openOrders.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">No open orders</td></tr>
              ) : (
                openOrders.map(order => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                    <td className="px-6 py-4 text-gray-300 whitespace-nowrap">
                      {new Date(order.created_at || Date.now()).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium">{order.symbol.replace('_', '/')}</td>
                    <td className={`px-6 py-4 font-bold uppercase ${order.side === 'buy' ? 'text-success' : 'text-danger'}`}>
                      {order.side}
                    </td>
                    <td className="px-6 py-4 uppercase text-gray-300">{order.type}</td>
                    <td className="px-6 py-4 text-right">${order.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-6 py-4 text-right">{order.quantity}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-medium uppercase">
                        {order.status || 'open'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleCancel(order.id)}
                        disabled={cancelling === order.id}
                        className="text-danger text-sm font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        {cancelling === order.id ? 'Cancelling...' : 'Cancel'}
                      </button>
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
