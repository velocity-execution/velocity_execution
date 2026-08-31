import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchSellerStats, fetchSellerActivity } from '../store/sellerSlice';
import { Package, TrendingUp, Lock, DollarSign, ArrowRight } from 'lucide-react';

export default function SellerDashboard() {
  const dispatch = useDispatch();
  const { stats, activity, loading } = useSelector((state) => state.seller);

  useEffect(() => {
    dispatch(fetchSellerStats());
    dispatch(fetchSellerActivity());
  }, [dispatch]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-surface rounded-lg p-5 border border-border">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <DollarSign size={18} className="text-primary" />
            <h2 className="text-sm font-medium">Total Revenue</h2>
          </div>
          {loading && !stats ? (
            <div className="h-8 w-32 bg-border animate-pulse rounded mt-2"></div>
          ) : (
            <div className="text-3xl font-bold">${stats?.totalRevenue?.toLocaleString()}</div>
          )}
        </div>

        {/* Products Sold */}
        <div className="bg-surface rounded-lg p-5 border border-border">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <TrendingUp size={18} className="text-success" />
            <h2 className="text-sm font-medium">Products Sold</h2>
          </div>
          {loading && !stats ? (
            <div className="h-8 w-16 bg-border animate-pulse rounded mt-2"></div>
          ) : (
            <div className="text-3xl font-bold">{stats?.totalProductsSold}</div>
          )}
        </div>

        {/* Active Listings */}
        <div className="bg-surface rounded-lg p-5 border border-border">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Package size={18} className="text-info" />
            <h2 className="text-sm font-medium">Active Listings</h2>
          </div>
          {loading && !stats ? (
            <div className="h-8 w-16 bg-border animate-pulse rounded mt-2"></div>
          ) : (
            <div className="text-3xl font-bold">{stats?.activeListings}</div>
          )}
        </div>

        {/* Locked Inventory Value */}
        <div className="bg-surface rounded-lg p-5 border border-border">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Lock size={18} className="text-warning" />
            <h2 className="text-sm font-medium">Locked Value</h2>
          </div>
          {loading && !stats ? (
            <div className="h-8 w-32 bg-border animate-pulse rounded mt-2"></div>
          ) : (
            <div className="text-3xl font-bold">${stats?.lockedInventoryValue?.toLocaleString()}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="bg-surface rounded-lg p-5 border border-border lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-lg">Recent Sales & Activity</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {loading && activity.length === 0 ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3"><div className="h-4 w-24 bg-border animate-pulse rounded"></div></td>
                      <td className="py-3"><div className="h-4 w-16 bg-border animate-pulse rounded"></div></td>
                      <td className="py-3"><div className="h-4 w-32 bg-border animate-pulse rounded"></div></td>
                      <td className="py-3 text-right"><div className="h-4 w-20 bg-border animate-pulse rounded ml-auto"></div></td>
                    </tr>
                  ))
                ) : activity.length > 0 ? (
                  activity.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                      <td className="py-3 text-gray-400">{new Date(item.time).toLocaleString()}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                          item.action === 'Sold' ? 'bg-success/20 text-success' : 
                          item.action === 'Sold Out' ? 'bg-danger/20 text-danger' : 
                          'bg-primary/20 text-primary'
                        }`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-white">{item.product} {item.amount > 0 && `(x${item.amount})`}</td>
                      <td className="py-3 text-right font-medium">${item.price.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="py-6 text-center text-gray-500">No recent activity</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-surface rounded-lg p-5 border border-border">
          <h2 className="font-medium text-lg mb-4">Quick Links</h2>
          <div className="flex flex-col gap-3">
            <Link to="/seller/products" className="p-4 bg-background border border-border rounded hover:border-primary transition-colors flex items-center justify-between group">
              <span className="font-medium">Manage Products</span>
              <ArrowRight size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
