import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSellerOrders, fetchOrderDetails } from '../store/sellerSlice';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  User, 
  DollarSign, 
  Package, 
  ArrowUpRight, 
  X, 
  Copy, 
  Check 
} from 'lucide-react';

export default function SellerOrders() {
  const dispatch = useDispatch();
  const { orders, orderLoading, currentOrder } = useSelector((state) => state.seller);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    dispatch(fetchSellerOrders());
  }, [dispatch]);

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    let result = Array.isArray(orders) ? [...orders] : [];

    if (statusFilter !== 'All') {
      result = result.filter(o => (o.status || '').toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(o => 
        (o.id && o.id.toLowerCase().includes(query)) ||
        (o.product_name && o.product_name.toLowerCase().includes(query)) ||
        (o.product_symbol && o.product_symbol.toLowerCase().includes(query)) ||
        (o.buyer_name && o.buyer_name.toLowerCase().includes(query))
      );
    }

    return result;
  }, [orders, statusFilter, searchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    dispatch(fetchOrderDetails(order.id));
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Metrics summary
  const totalRevenue = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return list.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  }, [orders]);

  const completedCount = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return list.filter(o => (o.status || '').toLowerCase() === 'completed').length;
  }, [orders]);

  const pendingCount = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return list.filter(o => ['pending', 'processing'].includes((o.status || '').toLowerCase())).length;
  }, [orders]);

  const getStatusBadge = (status = '') => {
    const s = status.toLowerCase();
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 size={12} />
          Completed
        </span>
      );
    }
    if (s === 'processing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30">
          <RefreshCw size={12} className="animate-spin" />
          Processing
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock size={12} />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <XCircle size={12} />
        {status || 'Cancelled'}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShoppingBag className="text-primary" size={26} />
            Orders & Sales
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Track customer purchases, fulfillment status, and transaction history
          </p>
        </div>
        <button
          onClick={() => dispatch(fetchSellerOrders())}
          className="flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-border/60 border border-border text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw size={14} className={orderLoading ? 'animate-spin text-primary' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl p-5 border border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Sales Volume</span>
            <div className="text-2xl font-bold text-white mt-1.5">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <span className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
              <ArrowUpRight size={13} /> Across all orders
            </span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Completed Orders</span>
            <div className="text-2xl font-bold text-white mt-1.5">{completedCount}</div>
            <span className="text-xs text-gray-400 mt-1 block">Successfully settled</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pending / Processing</span>
            <div className="text-2xl font-bold text-white mt-1.5">{pendingCount}</div>
            <span className="text-xs text-amber-400 flex items-center gap-1 mt-1">
              <Clock size={13} /> Requires settlement
            </span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-surface rounded-xl p-4 border border-border flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-background/60 rounded-lg border border-border/50">
          {['All', 'Completed', 'Processing', 'Pending', 'Cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-primary text-black font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-surface'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, product, buyer..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background/80 text-gray-400 border-b border-border text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Order ID</th>
                <th className="py-3.5 px-4 font-semibold">Product</th>
                <th className="py-3.5 px-4 font-semibold">Buyer</th>
                <th className="py-3.5 px-4 font-semibold text-center">Qty</th>
                <th className="py-3.5 px-4 font-semibold text-right">Unit Price</th>
                <th className="py-3.5 px-4 font-semibold text-right">Total Price</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {orderLoading && filteredOrders.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-border/60 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-border/60 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-border/60 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-8 bg-border/60 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-border/60 rounded ml-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-border/60 rounded ml-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-border/60 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-border/60 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-16 bg-border/60 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-border/20 transition-colors">
                    <td className="py-4 px-4 font-mono text-xs text-primary font-medium">
                      {order.id}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-xs font-bold text-gray-300">
                          {order.product_symbol?.slice(0, 3) || 'ITM'}
                        </div>
                        <div>
                          <div className="font-medium text-white line-clamp-1">{order.product_name || 'Product'}</div>
                          <div className="text-xs text-gray-400">{order.product_symbol || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-gray-500" />
                        {order.buyer_name || 'Anonymous Buyer'}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-medium text-white">
                      {order.quantity}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300 font-mono">
                      ${Number(order.unit_price || (order.total_price / (order.quantity || 1))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-400 font-mono">
                      ${Number(order.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-4 px-4 text-gray-400 text-xs">
                      {new Date(order.created_at || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(order)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-background hover:bg-border border border-border text-xs font-medium text-gray-300 hover:text-white transition-colors"
                      >
                        <Eye size={12} />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <ShoppingBag size={36} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-base font-medium text-gray-300">No orders found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {searchTerm || statusFilter !== 'All' 
                        ? 'Try changing your search keywords or status filter' 
                        : 'Customer orders will appear here as soon as sales are made'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {filteredOrders.length > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-gray-400">
            <div>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded bg-background border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-border transition-colors text-white"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 font-medium text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded bg-background border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-border transition-colors text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  Order Details
                  <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {selectedOrder.id}
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Placed on {new Date(selectedOrder.created_at || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-border/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-sm">
              {/* Status Banner */}
              <div className="bg-background/70 border border-border rounded-lg p-3.5 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Fulfillment Status</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Product Information */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Purchased Item</h4>
                <div className="p-3.5 bg-background border border-border rounded-lg flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-surface border border-border flex items-center justify-center text-primary font-bold text-sm">
                    {selectedOrder.product_symbol?.slice(0, 3) || 'ITM'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{selectedOrder.product_name}</div>
                    <div className="text-xs text-gray-400">Symbol: {selectedOrder.product_symbol || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">x{selectedOrder.quantity}</div>
                    <div className="text-xs text-gray-400">
                      ${Number(selectedOrder.unit_price || (selectedOrder.total_price / selectedOrder.quantity)).toLocaleString(undefined, { minimumFractionDigits: 2 })} each
                    </div>
                  </div>
                </div>
              </div>

              {/* Buyer Information */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Customer Information</h4>
                <div className="p-3.5 bg-background border border-border rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Buyer Name:</span>
                    <span className="text-white font-medium">{selectedOrder.buyer_name || 'Verified Buyer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Asset:</span>
                    <span className="text-white font-medium">USDT (Escrow Settled)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Settlement Method:</span>
                    <span className="text-emerald-400 font-medium">Velocity Instant Escrow</span>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Payment Summary</h4>
                <div className="p-3.5 bg-background border border-border rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal ({selectedOrder.quantity} units)</span>
                    <span className="font-mono">${Number(selectedOrder.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Platform Fee (0.00%)</span>
                    <span className="font-mono text-emerald-400">$0.00</span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between font-bold text-sm text-white">
                    <span>Seller Net Payout</span>
                    <span className="font-mono text-emerald-400 text-base">${Number(selectedOrder.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-background border-t border-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyId(selectedOrder.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-border/60 border border-border rounded text-xs text-gray-300 hover:text-white transition-colors"
              >
                {copiedId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copiedId ? 'Copied ID' : 'Copy Order ID'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-black font-semibold rounded text-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
