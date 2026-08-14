import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchWallets } from '../store/walletSlice';
import { fetchSymbols } from '../store/marketSlice';
import { fetchOpenOrders } from '../store/orderSlice';
import { Wallet, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const dispatch = useDispatch();
  const { balances, loading: walletLoading } = useSelector(state => state.wallet);
  const { symbols, loading: marketLoading } = useSelector(state => state.market);
  const { openOrders, loading: orderLoading } = useSelector(state => state.order);

  useEffect(() => {
    dispatch(fetchWallets());
    dispatch(fetchSymbols());
    dispatch(fetchOpenOrders());
  }, [dispatch]);

  const totalBalance = (Array.isArray(balances) ? balances : [])?.reduce((acc, b) => acc + (b.available + b.locked), 0) || 0;

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
                 ) : symbols && symbols.length > 0 ? (
                   symbols.slice(0, 4).map((s) => (
                     <tr key={s.symbol} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                       <td className="py-3 font-medium">
                         <Link to={`/trade/${s.symbol}`} className="hover:text-primary transition-colors">
                           {s.symbol.replace('_', '/')}
                         </Link>
                       </td>
                       <td className="py-3 text-right">${s.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                       <td className={`py-3 text-right flex items-center justify-end gap-1 ${s.change24h >= 0 ? 'text-success' : 'text-danger'}`}>
                         {s.change24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                         {Math.abs(s.change24h).toFixed(2)}%
                       </td>
                       <td className="py-3 text-right text-gray-400">${s.volume24h.toLocaleString()}</td>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-surface rounded-lg p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
             <h2 className="font-medium text-lg">Recent Open Orders</h2>
             <Link to="/orders/open" className="text-primary text-sm hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
             {orderLoading ? (
               <div className="h-10 bg-border animate-pulse rounded"></div>
             ) : openOrders && openOrders.length > 0 ? (
               openOrders.slice(0, 3).map(order => (
                 <div key={order.id} className="flex justify-between items-center p-3 bg-background rounded border border-border/50">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <span className={order.side === 'buy' ? 'text-success uppercase text-xs font-bold' : 'text-danger uppercase text-xs font-bold'}>
                          {order.side}
                        </span>
                        <span>{order.symbol.replace('_', '/')}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{order.type.toUpperCase()}</div>
                    </div>
                    <div className="text-right">
                      <div>{order.quantity} @ ${order.price}</div>
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
             <Link to="/trade/BTC_USD" className="p-4 bg-background border border-border rounded hover:border-primary transition-colors flex flex-col items-center justify-center gap-2">
               <span className="font-medium">Trade BTC</span>
             </Link>
             <Link to="/trade/ETH_USD" className="p-4 bg-background border border-border rounded hover:border-primary transition-colors flex flex-col items-center justify-center gap-2">
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
