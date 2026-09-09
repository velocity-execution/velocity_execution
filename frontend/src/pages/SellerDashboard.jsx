import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { 
  fetchSellerStats, 
  fetchSellerActivity, 
  fetchSellerAlerts, 
  fetchSellerWallet 
} from '../store/sellerSlice';
import { 
  Package, 
  TrendingUp, 
  Lock, 
  DollarSign, 
  ArrowRight, 
  AlertTriangle, 
  Boxes, 
  ShoppingBag, 
  Wallet, 
  ExternalLink,
  ShieldCheck,
  Clock
} from 'lucide-react';

export default function SellerDashboard() {
  const dispatch = useDispatch();
  const { stats, activity, alerts, wallet, loading } = useSelector((state) => state.seller);

  useEffect(() => {
    dispatch(fetchSellerStats());
    dispatch(fetchSellerActivity());
    dispatch(fetchSellerAlerts());
    dispatch(fetchSellerWallet());
  }, [dispatch]);

  const availableBalance = Number(wallet?.availableBalance || 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Seller Overview</h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time performance, inventory alerts, and earnings summary
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/seller/products"
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-black font-semibold rounded-lg text-sm transition-colors shadow-md shadow-primary/20"
          >
            + New Product
          </Link>
          <Link
            to="/seller/wallet"
            className="px-4 py-2 bg-surface hover:bg-border/60 border border-border text-white rounded-lg text-sm font-medium transition-colors"
          >
            Payouts
          </Link>
        </div>
      </div>

      {/* Low Stock Alerts Banner (if any) */}
      {Array.isArray(alerts) && alerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm">
                Low Inventory Warning: {alerts.length} {alerts.length === 1 ? 'item requires' : 'items require'} restock
              </div>
              <div className="text-xs text-amber-300/80 mt-0.5">
                {alerts.map(a => `${a.name} (${a.stock} left)`).join(' • ')}
              </div>
            </div>
          </div>
          <Link
            to="/seller/inventory"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-xs font-semibold text-amber-300 hover:text-white transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            Manage Stock <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-surface rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Sales Volume</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <DollarSign size={18} />
            </div>
          </div>
          {loading && !stats ? (
            <div className="h-8 w-32 bg-border/60 animate-pulse rounded mt-2"></div>
          ) : (
            <div className="text-3xl font-bold font-mono text-white">
              ${stats?.totalRevenue ? Number(stats.totalRevenue).toLocaleString() : '0.00'}
            </div>
          )}
          <span className="text-xs text-emerald-400 mt-2 block">
            Across all settled orders
          </span>
        </div>

        {/* Available Wallet Balance */}
        <div className="bg-surface rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Available Balance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Wallet size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400">
            ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <Link to="/seller/wallet" className="text-xs text-gray-400 hover:text-primary mt-2 inline-flex items-center gap-1 transition-colors">
            Request Payout <ArrowRight size={12} />
          </Link>
        </div>

        {/* Products Sold */}
        <div className="bg-surface rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Units Sold</span>
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center text-info">
              <TrendingUp size={18} />
            </div>
          </div>
          {loading && !stats ? (
            <div className="h-8 w-16 bg-border/60 animate-pulse rounded mt-2"></div>
          ) : (
            <div className="text-3xl font-bold font-mono text-white">
              {stats?.totalProductsSold || 0}
            </div>
          )}
          <Link to="/seller/orders" className="text-xs text-gray-400 hover:text-primary mt-2 inline-flex items-center gap-1 transition-colors">
            View All Orders <ArrowRight size={12} />
          </Link>
        </div>

        {/* Active Listings */}
        <div className="bg-surface rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Listings</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Package size={18} />
            </div>
          </div>
          {loading && !stats ? (
            <div className="h-8 w-16 bg-border/60 animate-pulse rounded mt-2"></div>
          ) : (
            <div className="text-3xl font-bold font-mono text-white">
              {stats?.activeListings || 0}
            </div>
          )}
          <Link to="/seller/products" className="text-xs text-gray-400 hover:text-primary mt-2 inline-flex items-center gap-1 transition-colors">
            Manage Catalog <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Main Grid: Activity & Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Table */}
        <div className="bg-surface rounded-xl p-5 border border-border lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg text-white">Recent Sales & Activity</h2>
              <p className="text-xs text-gray-400">Latest marketplace transactions on your listings</p>
            </div>
            <Link
              to="/seller/orders"
              className="text-xs text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1"
            >
              See all orders <ArrowRight size={13} />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-border text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Item Sold</th>
                  <th className="pb-3 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(() => {
                  const activityList = Array.isArray(activity) ? activity : [];
                  if (loading && activityList.length === 0) {
                    return Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3.5"><div className="h-4 w-24 bg-border/60 rounded"></div></td>
                        <td className="py-3.5"><div className="h-4 w-16 bg-border/60 rounded"></div></td>
                        <td className="py-3.5"><div className="h-4 w-32 bg-border/60 rounded"></div></td>
                        <td className="py-3.5 text-right"><div className="h-4 w-20 bg-border/60 rounded ml-auto"></div></td>
                      </tr>
                    ));
                  }
                  if (activityList.length > 0) {
                    return activityList.slice(0, 6).map((item) => (
                      <tr key={item.id} className="hover:bg-border/20 transition-colors">
                        <td className="py-3.5 text-xs text-gray-400 font-mono">
                          {new Date(item.time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${
                            item.action === 'Sold' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 
                            item.action === 'Sold Out' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 
                            'bg-primary/15 text-primary border border-primary/30'
                          }`}>
                            {item.action}
                          </span>
                        </td>
                        <td className="py-3.5 font-medium text-white">
                          {item.product} {item.amount > 0 && <span className="text-gray-400 font-normal">(x{item.amount})</span>}
                        </td>
                        <td className="py-3.5 text-right font-bold text-emerald-400 font-mono">
                          +${Number(item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ));
                  }
                  return (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-500 text-sm">
                        No sales transactions recorded yet.
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Management Navigation */}
        <div className="bg-surface rounded-xl p-5 border border-border flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-lg text-white mb-1">Seller Hub</h2>
            <p className="text-xs text-gray-400 mb-4">Quick navigation to your operations</p>
            
            <div className="flex flex-col gap-2.5">
              <Link
                to="/seller/products"
                className="p-3.5 bg-background border border-border rounded-lg hover:border-primary transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Package size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-primary transition-colors">My Products</div>
                    <div className="text-xs text-gray-400">List, edit, and catalog items</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
              </Link>

              <Link
                to="/seller/orders"
                className="p-3.5 bg-background border border-border rounded-lg hover:border-primary transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-primary transition-colors">Orders & Sales</div>
                    <div className="text-xs text-gray-400">Track buyer purchases and fulfillment</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
              </Link>

              <Link
                to="/seller/inventory"
                className="p-3.5 bg-background border border-border rounded-lg hover:border-primary transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Boxes size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-primary transition-colors">Inventory Management</div>
                    <div className="text-xs text-gray-400">Stock counts & threshold alerts</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
              </Link>

              <Link
                to="/seller/wallet"
                className="p-3.5 bg-background border border-border rounded-lg hover:border-primary transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-primary transition-colors">Wallet & Payouts</div>
                    <div className="text-xs text-gray-400">Withdraw earnings to USDT or bank</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Verified Seller Status
            </span>
            <span className="text-primary font-mono font-medium">0% Fee Promo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
