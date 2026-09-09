import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchProductDetails, 
  updateProduct, 
  toggleProductStatus, 
  adjustStock, 
  clearSuccessMessage, 
  clearError 
} from '../store/sellerSlice';
import { 
  ArrowLeft, 
  Edit2, 
  Sliders, 
  ListOrdered, 
  Play, 
  Pause, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Cpu, 
  X 
} from 'lucide-react';

export default function SellerProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentProduct, loading, error, successMessage } = useSelector(state => state.seller);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [newStockValue, setNewStockValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('Manual replenishment');

  useEffect(() => {
    if (id) {
      dispatch(fetchProductDetails(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (currentProduct) {
      setEditFormData({
        name: currentProduct.name || '',
        symbol: currentProduct.symbol || '',
        description: currentProduct.description || '',
        category: currentProduct.category || 'Tokenized Share',
        price: currentProduct.price ?? '',
        stock: currentProduct.stock ?? '',
        min_order_qty: currentProduct.min_order_qty || 1,
        max_order_qty: currentProduct.max_order_qty || 100,
        low_stock_threshold: currentProduct.low_stock_threshold || 5,
        status: currentProduct.status || 'Active',
      });
      setNewStockValue(currentProduct.stock ?? 0);
    }
  }, [currentProduct]);

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => dispatch(clearSuccessMessage()), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage, dispatch]);

  const handleToggleStatus = async () => {
    if (!currentProduct) return;
    const nextStatus = currentProduct.status === 'Active' ? 'Inactive' : 'Active';
    await dispatch(toggleProductStatus({ id: currentProduct.id, status: nextStatus }));
    dispatch(fetchProductDetails(id));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await dispatch(updateProduct({
      id: currentProduct.id,
      updates: {
        ...editFormData,
        price: parseFloat(editFormData.price),
        stock: parseInt(editFormData.stock, 10),
      }
    }));
    setIsEditModalOpen(false);
    dispatch(fetchProductDetails(id));
  };

  const handleAdjustStockSubmit = async (e) => {
    e.preventDefault();
    await dispatch(adjustStock({
      productId: currentProduct.id,
      newStock: parseInt(newStockValue, 10),
      reason: adjustReason,
    }));
    setIsStockModalOpen(false);
    dispatch(fetchProductDetails(id));
  };

  if (loading && !currentProduct) {
    return (
      <div className="p-8 max-w-6xl mx-auto text-center py-24 space-y-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-400 text-sm">Loading product details...</p>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="p-8 max-w-6xl mx-auto text-center py-24 space-y-4">
        <AlertCircle size={40} className="text-danger mx-auto" />
        <h2 className="text-xl font-bold text-white">Product Not Found</h2>
        <p className="text-gray-400 text-sm">The product does not exist or you do not have permission to view it.</p>
        <Link to="/seller/products" className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-semibold">
          <ArrowLeft size={16} /> Back to My Products
        </Link>
      </div>
    );
  }

  const p = currentProduct;
  const threshold = p.low_stock_threshold || 5;
  const isLowStock = Number(p.stock) <= threshold && Number(p.stock) > 0;
  const isSoldOut = Number(p.stock) <= 0;
  const isShare = p.category?.includes('Share');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back Link */}
      <Link to="/seller/products" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
        <ArrowLeft size={16} /> Back to My Products
      </Link>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 border border-success/30 text-success text-sm">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Low Stock Warning Banner */}
      {isLowStock && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm">
          <AlertTriangle size={20} className="shrink-0" />
          <div className="flex-1">
            <strong>Low Inventory Warning:</strong> Only {p.stock} units remaining (below threshold of {threshold}). Consider replenishing stock to prevent stockouts.
          </div>
          <button 
            onClick={() => setIsStockModalOpen(true)}
            className="px-3 py-1.5 bg-warning text-black font-bold text-xs rounded-lg hover:bg-warning/90 transition-colors shrink-0"
          >
            Replenish Stock
          </button>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold ${
                isShare ? 'bg-info/10 text-info border border-info/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }`}>
                {isShare ? <TrendingUp size={12} /> : <Cpu size={12} />}
                {p.category || 'General'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                p.status === 'Active' 
                  ? 'bg-success/15 text-success border border-success/30' 
                  : 'bg-warning/15 text-warning border border-warning/30'
              }`}>
                {p.status}
              </span>
              <span className="text-xs font-mono text-gray-400">ID: {p.id}</span>
            </div>

            <h1 className="text-3xl font-extrabold text-white tracking-tight">{p.name}</h1>
            <div className="font-mono text-sm font-bold text-primary">{p.symbol}</div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-background border border-border text-gray-200 hover:text-white hover:border-primary text-xs font-semibold transition-all"
            >
              <Edit2 size={14} /> Edit Product
            </button>
            <button
              onClick={() => setIsStockModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-background border border-border text-gray-200 hover:text-white hover:border-primary text-xs font-semibold transition-all"
            >
              <Sliders size={14} /> Manage Inventory
            </button>
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                p.status === 'Active'
                  ? 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20'
                  : 'bg-success/10 text-success border-success/30 hover:bg-success/20'
              }`}
            >
              {p.status === 'Active' ? <><Pause size={14} /> Pause Listing</> : <><Play size={14} /> Activate Listing</>}
            </button>
            <Link
              to={`/seller/orders?search=${encodeURIComponent(p.symbol || p.name)}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white text-xs font-semibold transition-all"
            >
              <ListOrdered size={14} /> View Orders
            </Link>
          </div>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed max-w-3xl pt-2 border-t border-border/50">
          {p.description || 'No description provided for this product.'}
        </p>

        {/* Timestamps */}
        <div className="flex items-center gap-6 text-xs text-gray-400 pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <Clock size={13} />
            <span>Listed on: {new Date(p.created_at || Date.now()).toLocaleDateString()}</span>
          </div>
          <div>
            Last updated: {new Date(p.updated_at || Date.now()).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Metrics Section: Pricing, Inventory, and Sales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pricing Card */}
        <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <DollarSign size={16} className="text-primary" /> Pricing & Limits
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-400">Unit Price</div>
              <div className="text-3xl font-extrabold text-white mt-0.5">
                ${Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-xs font-medium text-gray-400 ml-1.5">USDT</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
              <div>
                <span className="text-gray-400">Min Order Qty:</span>
                <span className="font-bold text-white ml-1">{p.min_order_qty || 1}</span>
              </div>
              <div>
                <span className="text-gray-400">Max Order Qty:</span>
                <span className="font-bold text-white ml-1">{p.max_order_qty || 100}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Card */}
        <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <Package size={16} className="text-info" /> Inventory Breakdown
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400">Available Stock</div>
              <div className={`text-2xl font-extrabold mt-0.5 ${isOut ? 'text-danger' : isLowStock ? 'text-warning' : 'text-white'}`}>
                {p.stock}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Locked / In Escrow</div>
              <div className="text-2xl font-extrabold text-gray-300 mt-0.5 font-mono">
                {p.locked || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Total Units Sold</div>
              <div className="text-xl font-bold text-success mt-0.5">
                {p.sold_quantity || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Alert Threshold</div>
              <div className="text-xl font-bold text-gray-300 mt-0.5">
                {threshold} units
              </div>
            </div>
          </div>
        </div>

        {/* Sales Card */}
        <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <TrendingUp size={16} className="text-success" /> Performance
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-400">Gross Sales Volume</div>
              <div className="text-3xl font-extrabold text-success mt-0.5">
                ${((Number(p.sold_quantity) || 0) * Number(p.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="pt-2 border-t border-border/50 flex justify-between text-xs text-gray-400">
              <span>Inventory Status:</span>
              <span className={`font-bold ${isOut ? 'text-danger' : isLowStock ? 'text-warning' : 'text-success'}`}>
                {isOut ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Healthy Inventory'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-lg text-white">Edit Product Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({...editFormData, price: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editFormData.stock}
                    onChange={(e) => setEditFormData({...editFormData, stock: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-background border border-border text-sm text-gray-300 hover:bg-border/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-sm font-bold text-white"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Inventory Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-lg text-white">Adjust Product Stock</h3>
              <button onClick={() => setIsStockModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdjustStockSubmit} className="space-y-4">
              <div className="p-3 bg-background rounded-lg border border-border space-y-1 text-xs">
                <div className="text-gray-400">Current Stock: <strong className="text-white">{p.stock} units</strong></div>
                <div className="text-gray-400">Locked Stock: <strong className="text-white">{p.locked || 0} units</strong></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">New Total Available Stock</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-white font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Reason for Adjustment</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="Manual replenishment">Manual replenishment</option>
                  <option value="Inventory audit recount">Inventory audit recount</option>
                  <option value="Damaged/returned goods">Damaged/returned goods</option>
                  <option value="Supplier restock shipment">Supplier restock shipment</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-background border border-border text-sm text-gray-300 hover:bg-border/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-sm font-bold text-white"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
