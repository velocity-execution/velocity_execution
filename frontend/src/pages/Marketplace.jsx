import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchMarketplaceProducts, 
  toggleWatchlist, 
  buyProduct, 
  clearBuyStatus 
} from '../store/marketplaceSlice';
import { fetchWallets } from '../store/walletSlice';
import { 
  Search, 
  Eye, 
  EyeOff, 
  ShoppingCart, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Cpu, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles,
  Package
} from 'lucide-react';
import { marketplaceApi } from '../api/marketplaceApi';

const CATEGORIES = ['All', 'Tokenized Share', 'Hardware / Tech', 'My Purchases'];

export default function Marketplace() {
  const dispatch = useDispatch();
  const { products, loading, buying, buySuccess, error } = useSelector(state => state.marketplace);
  const { balances } = useSelector(state => state.wallet);
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [notification, setNotification] = useState(null);
  const [myPurchases, setMyPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const fetchPurchases = async () => {
    setPurchasesLoading(true);
    try {
      const res = await marketplaceApi.getBuyerOrders();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setMyPurchases(list);
    } catch (e) {
      console.warn('Failed to load buyer purchases', e);
    } finally {
      setPurchasesLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'My Purchases') {
      fetchPurchases();
    } else {
      dispatch(fetchMarketplaceProducts({ category: selectedCategory, search: searchTerm }));
    }
    dispatch(fetchWallets());
  }, [dispatch, selectedCategory, searchTerm]);

  // Find user's available USDT balance
  const balancesList = Array.isArray(balances) ? balances : [];
  const usdtWallet = balancesList.find(b => b.asset?.toUpperCase() === 'USDT');
  const availableUSDT = Number(usdtWallet?.available || 0);

  const handleToggleWatch = async (product) => {
    try {
      const res = await dispatch(toggleWatchlist(product.id)).unwrap();
      const statusText = res.isMonitored ? 'added to your Monitored Products' : 'removed from your Watchlist';
      setNotification({
        type: 'success',
        message: `${product.name} ${statusText}.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err || 'Failed to update watchlist.',
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleOpenBuyModal = (product) => {
    setSelectedProduct(product);
    setBuyQuantity(1);
    dispatch(clearBuyStatus());
  };

  const handleConfirmBuy = async () => {
    if (!selectedProduct) return;
    try {
      await dispatch(buyProduct({ productId: selectedProduct.id, quantity: buyQuantity })).unwrap();
      setNotification({
        type: 'success',
        message: `Successfully purchased ${buyQuantity} unit(s) of ${selectedProduct.name}!`,
      });
      setTimeout(() => {
        setSelectedProduct(null);
        setNotification(null);
      }, 3000);
    } catch (err) {
      // Error handled via Redux state
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-surface to-surface border border-primary/20 p-8">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} /> Velocity Verified Marketplace
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Asset Marketplace & Tokenized Shares
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Monitor real-time inventory, track price changes on your dashboard, and purchase tokenized shares and high-performance hardware directly using your Velocity wallet.
          </p>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border text-sm transition-all ${
          notification.type === 'success' 
            ? 'bg-success/10 border-success/30 text-success' 
            : 'bg-danger/10 border-danger/30 text-danger'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto p-1 bg-surface rounded-xl border border-border">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-border/30'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface rounded-xl border border-border text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* If My Purchases Tab is Selected */}
      {selectedCategory === 'My Purchases' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="text-primary" size={20} />
              <span>My Purchased Products & Assets</span>
            </h2>
            <span className="text-xs text-gray-400">
              {myPurchases.length} item{myPurchases.length !== 1 ? 's' : ''} owned
            </span>
          </div>

          {purchasesLoading ? (
            <div className="p-12 text-center text-gray-400 bg-surface rounded-xl border border-border">
              Loading your purchases...
            </div>
          ) : myPurchases.length === 0 ? (
            <div className="p-12 text-center bg-surface rounded-xl border border-border space-y-3">
              <Package size={36} className="mx-auto text-gray-500" />
              <p className="text-gray-300 font-medium">You haven't purchased any products yet.</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Explore the marketplace catalog to buy verified tokenized shares, mining equipment, or hardware nodes.
              </p>
              <button
                onClick={() => setSelectedCategory('All')}
                className="px-4 py-2 bg-primary text-black font-semibold rounded-lg text-xs"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPurchases.map(order => (
                <div key={order.id} className="bg-surface rounded-xl border border-border p-5 space-y-4 shadow-sm hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> {order.status || 'Completed'}
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white">{order.product_name}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span className="font-mono text-primary font-semibold">{order.symbol}</span>
                      <span>•</span>
                      <span>{order.category}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0f172a]/60 rounded-lg border border-border/50 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block">Quantity</span>
                      <span className="font-bold text-white text-sm">{order.quantity} unit{order.quantity > 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 block">Total Paid</span>
                      <span className="font-bold text-emerald-400 text-sm font-mono">${Number(order.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-500 font-mono truncate">
                    Order ID: {order.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading && products.length === 0 ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-xl border border-border p-5 space-y-4 animate-pulse">
                <div className="h-5 w-24 bg-border rounded"></div>
                <div className="h-6 w-40 bg-border rounded"></div>
                <div className="h-12 w-full bg-border/40 rounded"></div>
                <div className="h-8 w-full bg-border rounded"></div>
              </div>
            ))
          ) : products.length > 0 ? (
            products.map(product => {
              const isShare = product.category?.includes('Share');
              const isLowStock = product.stock > 0 && product.stock <= 10;
              const isSoldOut = product.stock <= 0;

              return (
                <div 
                  key={product.id}
                  className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-lg group"
                >
                  <div className="space-y-3">
                    {/* Category and Stock Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isShare ? 'bg-info/10 text-info border border-info/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {isShare ? <TrendingUp size={12} /> : <Cpu size={12} />}
                        {product.category}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        isSoldOut 
                          ? 'bg-danger/10 text-danger border border-danger/20' 
                          : isLowStock 
                            ? 'bg-warning/10 text-warning border border-warning/20' 
                            : 'bg-success/10 text-success border border-success/20'
                      }`}>
                        {isSoldOut ? 'Sold Out' : `${product.stock} in stock`}
                      </span>
                    </div>

                    {/* Title and Symbol */}
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <span className="text-xs font-mono font-medium text-gray-400">
                        {product.symbol}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed min-h-[32px]">
                      {product.description || 'Verified Velocity marketplace asset backed by seller inventory.'}
                    </p>
                  </div>

                  {/* Price and Action Buttons */}
                  <div className="pt-4 mt-4 border-t border-border/50 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-gray-400">Price</span>
                      <span className="text-xl font-bold font-mono text-white">
                        ${Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {/* Monitor / Watch Button */}
                      <button
                        onClick={() => handleToggleWatch(product)}
                        title={product.is_monitored ? 'Remove from Monitored Products' : 'Add to Monitored Products'}
                        className={`col-span-2 py-2 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                          product.is_monitored 
                            ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30' 
                            : 'bg-background border-border text-gray-400 hover:text-white hover:border-gray-500'
                        }`}
                      >
                        {product.is_monitored ? (
                          <>
                            <EyeOff size={14} />
                            <span>Watching</span>
                          </>
                        ) : (
                          <>
                            <Eye size={14} />
                            <span>Monitor</span>
                          </>
                        )}
                      </button>

                      {/* Buy Button */}
                      <button
                        disabled={isSoldOut}
                        onClick={() => handleOpenBuyModal(product)}
                        className={`col-span-3 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          isSoldOut 
                            ? 'bg-border text-gray-500 cursor-not-allowed' 
                            : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                      >
                        <ShoppingCart size={14} />
                        <span>Buy Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16 bg-surface rounded-xl border border-border">
              <p className="text-gray-400 font-medium">No products match your filter criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <ShoppingCart size={18} />
                </div>
                <h3 className="font-bold text-lg text-white">Direct Checkout</h3>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Product Summary */}
            <div className="p-4 bg-background rounded-xl border border-border space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white text-base">{selectedProduct.name}</h4>
                  <span className="text-xs text-gray-400 font-mono">{selectedProduct.symbol} • {selectedProduct.category}</span>
                </div>
                <span className="text-sm font-bold text-primary">
                  ${Number(selectedProduct.price).toFixed(2)} USDT
                </span>
              </div>
              <div className="text-xs text-gray-400 pt-1">
                Available Inventory: <strong className="text-white">{selectedProduct.stock} units</strong>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Purchase Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBuyQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-lg bg-background border border-border text-white hover:border-primary transition-colors font-bold text-lg flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct.stock}
                  value={buyQuantity}
                  onChange={(e) => setBuyQuantity(Math.max(1, Math.min(selectedProduct.stock, parseInt(e.target.value) || 1)))}
                  className="flex-1 h-10 bg-background border border-border rounded-lg text-center font-bold text-white focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => setBuyQuantity(q => Math.min(selectedProduct.stock, q + 1))}
                  className="w-10 h-10 rounded-lg bg-background border border-border text-white hover:border-primary transition-colors font-bold text-lg flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total and Balance Preview */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Amount:</span>
                <span className="font-extrabold text-lg text-white">
                  ${(Number(selectedProduct.price) * buyQuantity).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                </span>
              </div>

              <div className="flex justify-between text-xs py-2 px-3 bg-background rounded-lg border border-border">
                <span className="text-gray-400">Your Available Wallet Balance:</span>
                <span className={`font-bold ${availableUSDT >= Number(selectedProduct.price) * buyQuantity ? 'text-success' : 'text-danger'}`}>
                  ${availableUSDT.toLocaleString()} USDT
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {buySuccess && (
              <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-success text-xs flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span>Order executed! Funds settled and stock updated.</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 py-2.5 rounded-lg border border-border text-gray-300 hover:text-white hover:bg-border/20 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={buying || availableUSDT < Number(selectedProduct.price) * buyQuantity || selectedProduct.stock < buyQuantity}
                onClick={handleConfirmBuy}
                className={`flex-1 py-2.5 rounded-lg text-white text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                  buying || availableUSDT < Number(selectedProduct.price) * buyQuantity || selectedProduct.stock < buyQuantity
                    ? 'bg-border text-gray-500 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {buying ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
