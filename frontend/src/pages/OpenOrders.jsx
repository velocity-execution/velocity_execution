import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOpenOrders } from '../store/orderSlice';
import { fetchWallets } from '../store/walletSlice';
import { orderApi } from '../api/orderApi';
import { RefreshCw, TrendingUp, TrendingDown, Clock, AlertCircle, ArrowUpRight, Zap, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const formatSymbol = (sym) => {
  if (!sym) return '';
  if (sym.includes('/') || sym.includes('_')) return sym.replace('_', '/');
  if (sym.endsWith('USDT')) return `${sym.slice(0, -4)}/USDT`;
  if (sym.endsWith('BTC')) return `${sym.slice(0, -3)}/BTC`;
  return sym;
};

export default function OpenOrders() {
  const dispatch = useDispatch();
  const { openOrders, loading, error } = useSelector(state => state.order);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelFeedback, setCancelFeedback] = useState(null);

  const loadOrders = () => {
    dispatch(fetchOpenOrders());
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order? Any locked funds will be returned to your wallet.')) {
      return;
    }
    setCancellingId(orderId);
    setCancelFeedback(null);
    try {
      await orderApi.cancelOrder(orderId);
      setCancelFeedback({ type: 'success', message: 'Order cancelled successfully. Locked funds unlocked.' });
      dispatch(fetchOpenOrders());
      dispatch(fetchWallets());
    } catch (err) {
      setCancelFeedback({ type: 'error', message: err.message || 'Failed to cancel order' });
    } finally {
      setCancellingId(null);
      setTimeout(() => setCancelFeedback(null), 5000);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const ordersList = Array.isArray(openOrders) ? openOrders : [];

  const stats = useMemo(() => {
    const total = ordersList.length;
    const buys = ordersList.filter(o => o.side?.toUpperCase() === 'BUY').length;
    const sells = ordersList.filter(o => o.side?.toUpperCase() === 'SELL').length;
    const totalVal = ordersList.reduce((acc, o) => acc + (Number(o.price || 0) * Number(o.quantity || 0)), 0);
    return { total, buys, sells, totalVal };
  }, [ordersList]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Open Orders
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
              {ordersList.length} Active
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Live open limit and market orders waiting for execution</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#0f172a] hover:bg-[#1e293b] text-gray-200 border border-[#1e293b] rounded-lg shadow-sm transition-all disabled:opacity-50"
            title="Refresh open orders"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-gray-400'} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            to="/trade/BTCUSDT"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg shadow-md shadow-primary/20 transition-all"
          >
            <span>Trade New</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-400 font-medium">Total Open Orders</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{stats.total}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Awaiting matching engine</div>
        </div>

        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Buy Orders
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{stats.buys}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Bids on order book</div>
        </div>

        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Sell Orders
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">{stats.sells}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Asks on order book</div>
        </div>

        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-400 font-medium">Estimated Open Value</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">
            ${stats.totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Total locked capital</div>
        </div>
      </div>

      {/* Feedback Toast */}
      {cancelFeedback && (
        <div className={`flex items-center justify-between p-3.5 rounded-xl border text-xs shadow-sm transition-all ${
          cancelFeedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{cancelFeedback.message}</span>
          </div>
          <button onClick={() => setCancelFeedback(null)} className="text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Informational Execution Banner */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-200 text-xs shadow-sm">
        <Zap size={16} className="text-blue-400 shrink-0" />
        <span>
          <strong>Automated Matching Engine:</strong> Orders are queued on the real-time orderbook and match automatically when counterparty limit or market orders cross. You can cancel any resting order at any time to instantly return locked funds to your wallet.
        </span>
      </div>

      {/* Orders Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a]/80 border-b border-border">
              <tr className="text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-3.5 font-semibold">Date & Time</th>
                <th className="px-6 py-3.5 font-semibold">Trading Pair</th>
                <th className="px-6 py-3.5 font-semibold">Side</th>
                <th className="px-6 py-3.5 font-semibold">Type</th>
                <th className="px-6 py-3.5 font-semibold text-right">Order Price</th>
                <th className="px-6 py-3.5 font-semibold text-right">Amount</th>
                <th className="px-6 py-3.5 font-semibold text-right">Remaining</th>
                <th className="px-6 py-3.5 font-semibold text-center">Status</th>
                <th className="px-6 py-3.5 font-semibold text-left">Trigger Condition</th>
                <th className="px-6 py-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading && ordersList.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-primary" />
                      <span>Loading active orders from server...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-danger">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={24} />
                      <span className="font-medium">Failed to load orders: {error}</span>
                      <button 
                        onClick={loadOrders}
                        className="mt-2 text-xs bg-danger/10 hover:bg-danger/20 text-danger px-3 py-1.5 rounded-lg border border-danger/20 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : ordersList.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-14 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-border/40 flex items-center justify-center text-gray-500">
                        <Clock size={22} />
                      </div>
                      <div className="font-semibold text-white">No open orders</div>
                      <p className="text-xs text-gray-500">
                        You do not have any pending orders. Submit limit or stop orders on the Trade terminal to see them listed here.
                      </p>
                      <Link
                        to="/trade/BTCUSDT"
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors shadow-md"
                      >
                        Go to Trading Terminal
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                ordersList.map(order => {
                  const isBuy = order.side?.toUpperCase() === 'BUY';
                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-gray-400 text-xs font-mono whitespace-nowrap">
                        {new Date(order.created_at || Date.now()).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
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
                        {order.type}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-white">
                        ${Number(order.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-200">
                        {order.quantity}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-400">
                        {order.remaining !== undefined ? order.remaining : order.quantity}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider">
                          {order.status || 'OPEN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                            <Zap size={11} className="text-primary" />
                            {isBuy 
                              ? `Auto-Buy ≤ $${Number(order.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                              : `Auto-Sell ≥ $${Number(order.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">Matching Engine Active</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingId === order.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 hover:border-rose-500/40 rounded-lg transition-all disabled:opacity-50 shadow-sm"
                          title="Cancel order and refund locked funds"
                        >
                          {cancellingId === order.id ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Cancelling...</span>
                            </>
                          ) : (
                            <>
                              <X size={13} />
                              <span>Cancel</span>
                            </>
                          )}
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
