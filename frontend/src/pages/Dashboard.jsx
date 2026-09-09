import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchWallets } from '../store/walletSlice';
import { fetchSymbols } from '../store/marketSlice';
import { fetchOpenOrders } from '../store/orderSlice';
import { fetchWatchlist, toggleWatchlist } from '../store/marketplaceSlice';
import { Wallet, TrendingUp, TrendingDown, ArrowRight, Eye, EyeOff, Cpu, ShoppingBag } from 'lucide-react';

export default function Dashboard() {
  const dispatch = useDispatch();
  const { balances, loading: walletLoading } = useSelector(state => state.wallet);
  const { symbols, loading: marketLoading } = useSelector(state => state.market);
  const { openOrders, loading: orderLoading } = useSelector(state => state.order);
  const { watchlist, watchlistLoading } = useSelector(state => state.marketplace);

  useEffect(() => {
    dispatch(fetchWallets());
    dispatch(fetchSymbols());
    dispatch(fetchOpenOrders());
    dispatch(fetchWatchlist());
  }, [dispatch]);

  const balancesList = Array.isArray(balances) ? balances : [];
  const symbolsList = Array.isArray(symbols) ? symbols : [];
  const openOrdersList = Array.isArray(openOrders) ? openOrders : [];
  const watchlistList = Array.isArray(watchlist) ? watchlist : [];

  const totalBalance = balancesList.reduce((acc, b) => acc + (Number(b.available || 0) + Number(b.locked || 0)), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet Overview */}
        <div className="bg-surface rounded-lg p-5 border border-border flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Wallet size={18} />
              <h2 className="text-sm font-medium">Estimated Balance</h2>
            </div>
            {walletLoading ? (
              <div className="h-8 w-32 bg-border animate-pulse rounded mt-2"></div>
            ) : (
              <div className="text-3xl font-bold">${totalBalance.toLocaleString()}</div>
            )}
          </div>
          <div className="mt-6">
            <Link to="/wallet" className="text-primary text-sm hover:underline flex items-center gap-1">
              Manage Wallet <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Market Movers */}
        <div className="bg-surface rounded-lg p-5 border border-border md:col-span-2">
           <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-lg">Market Overview</h2>
              <Link to="/markets" className="text-primary text-sm hover:underline">View All</Link>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead>
                 <tr className="text-gray-400 border-b border-border">
                   <th className="pb-2 font-medium">Symbol</th>
                   <th className="pb-2 font-medium text-right">Price</th>
                   <th className="pb-2 font-medium text-right">24h Change</th>
                   <th className="pb-2 font-medium text-right">Volume</th>
                 </tr>
               </thead>
               <tbody>
                 {marketLoading ? (
                   Array.from({ length: 3 }).map((_, i) => (
                     <tr key={i} className="border-b border-border/50">
                       <td className="py-3"><div className="h-4 w-16 bg-border animate-pulse rounded"></div></td>
                       <td className="py-3 text-right"><div className="h-4 w-20 bg-border animate-pulse rounded ml-auto"></div></td>
                       <td className="py-3 text-right"><div className="h-4 w-12 bg-border animate-pulse rounded ml-auto"></div></td>
                       <td className="py-3 text-right"><div className="h-4 w-24 bg-border animate-pulse rounded ml-auto"></div></td>
                     </tr>
                   ))
                 ) : symbolsList.length > 0 ? (
                   symbolsList.slice(0, 4).map((s) => (
                     <tr key={s.symbol} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                       <td className="py-3 font-medium">
                         <Link to={`/trade/${s.symbol}`} className="hover:text-primary transition-colors">
                           {s.symbol?.replace('_', '/') || s.symbol}
                         </Link>
                       </td>
                       <td className="py-3 text-right">${(s.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                       <td className={`py-3 text-right flex items-center justify-end gap-1 ${(s.change24h || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                         {(s.change24h || 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                         {Math.abs(s.change24h || 0).toFixed(2)}%
                       </td>
                       <td className="py-3 text-right text-gray-400">${(s.volume24h || 0).toLocaleString()}</td>
                     </tr>
                   ))
                 ) : (
                   <tr><td colSpan="4" className="py-4 text-center text-gray-500">No market data available</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>

      {/* Monitored Products & Shares */}
      <div className="bg-surface rounded-lg p-5 border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-primary" />
            <h2 className="font-medium text-lg text-white">Monitored Products & Shares</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
              {watchlistList.length} Active
            </span>
          </div>
          <Link to="/marketplace" className="text-primary text-sm hover:underline flex items-center gap-1">
            Explore Marketplace <ArrowRight size={14} />
          </Link>
        </div>

        {watchlistLoading && watchlistList.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-background/50 border border-border/50 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : watchlistList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {watchlistList.map(item => (
              <div key={item.id} className="p-4 bg-background rounded-lg border border-border hover:border-primary/40 transition-colors flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-gray-300">
                      {item.category?.includes('Share') ? 'Tokenized Share' : 'Hardware'}
                    </span>
                    <button
                      onClick={() => dispatch(toggleWatchlist(item.id))}
                      title="Remove from monitoring"
                      className="text-gray-500 hover:text-danger transition-colors p-1"
                    >
                      <EyeOff size={14} />
                    </button>
                  </div>
                  <h3 className="font-bold text-white text-sm truncate">{item.name}</h3>
                  <div className="text-xs text-gray-400 font-mono">{item.symbol}</div>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Price</div>
                    <div className="text-sm font-extrabold text-white">${Number(item.price).toLocaleString()} USDT</div>
                  </div>
                  <Link
                    to="/marketplace"
                    className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <ShoppingBag size={12} /> Buy
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-background/40 rounded-lg border border-dashed border-border/60 space-y-2">
            <p className="text-gray-400 text-sm">You are not monitoring any products or shares yet.</p>
            <Link to="/marketplace" className="inline-flex items-center gap-1 text-primary text-xs font-semibold hover:underline">
              Browse Marketplace to add items to your Watchlist <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-surface rounded-lg p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
             <h2 className="font-medium text-lg">Recent Open Orders</h2>
             <Link to="/orders/open" className="text-primary text-sm hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
             {orderLoading && openOrdersList.length === 0 ? (
               <div className="h-10 bg-border animate-pulse rounded"></div>
             ) : openOrdersList.length > 0 ? (
               openOrdersList.slice(0, 3).map(order => (
                 <div key={order.id} className="flex justify-between items-center p-3 bg-background rounded border border-border/50">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <span className={order.side?.toLowerCase() === 'buy' ? 'text-success uppercase text-xs font-bold' : 'text-danger uppercase text-xs font-bold'}>
                          {order.side}
                        </span>
                        <span>{order.symbol?.replace('_', '/') || order.symbol}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{(order.type || '').toUpperCase()}</div>
                    </div>
                    <div className="text-right">
                      <div>{order.quantity} @ ${Number(order.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(order.created_at || Date.now()).toLocaleDateString()}</div>
                    </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-6 text-gray-500">No open orders</div>
             )}
          </div>
        </div>

        {/* Favorite Pairs or placeholder */}
        <div className="bg-surface rounded-lg p-5 border border-border">
          <h2 className="font-medium text-lg mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
             <Link to="/trade/BTCUSDT" className="p-4 bg-background border border-border rounded hover:border-primary transition-colors flex flex-col items-center justify-center gap-2">
               <span className="font-medium">Trade BTC</span>
             </Link>
             <Link to="/trade/ETHUSDT" className="p-4 bg-background border border-border rounded hover:border-primary transition-colors flex flex-col items-center justify-center gap-2">
               <span className="font-medium">Trade ETH</span>
             </Link>
             <Link to="/wallet" className="p-4 bg-background border border-border rounded hover:border-primary transition-colors flex flex-col items-center justify-center gap-2">
               <span className="font-medium">Deposit Funds</span>
             </Link>
             <Link to="/orders/history" className="p-4 bg-background border border-border rounded hover:border-primary transition-colors flex flex-col items-center justify-center gap-2">
               <span className="font-medium">Order History</span>
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}



