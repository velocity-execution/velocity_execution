import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { 
  fetchSellerProducts, 
  createProduct, 
  updateProduct, 
  toggleProductStatus,
  clearSuccessMessage, 
  clearError 
} from '../store/sellerSlice';
import { 
  Plus, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Cpu, 
  Check,
  Boxes,
  Layers
} from 'lucide-react';

const CATEGORIES = [
  'Hardware / Tech', 
  'Cloud Infrastructure', 
  'Security Hardware', 
  'Mining Equipment', 
  'Digital Voucher', 
  'General'
];

const TICKER_OPTIONS = [
  { symbol: 'VAL-RACK', name: 'Enterprise Edge Validator Rack', category: 'Hardware / Tech', defaultPrice: '1450.00' },
  { symbol: 'LEDGER-STX', name: 'Ledger Stax Hardware Wallet', category: 'Security Hardware', defaultPrice: '277.69' },
  { symbol: 'S21-PRO', name: 'Antminer S21 Pro Miner', category: 'Mining Equipment', defaultPrice: '3800.00' },
  { symbol: 'H100-NODE', name: 'Velocity GPU Cloud Node', category: 'Cloud Infrastructure', defaultPrice: '2500.00' },
  { symbol: 'YUBI-5C', name: 'YubiKey 5C NFC Security Key', category: 'Security Hardware', defaultPrice: '55.00' },
  { symbol: 'STARLINK', name: 'Starlink High Performance Kit', category: 'Hardware / Tech', defaultPrice: '599.00' },
  { symbol: 'RTX-4090', name: 'NVIDIA RTX 4090 Workstation Rig', category: 'Hardware / Tech', defaultPrice: '3200.00' },
  { symbol: 'RPI5-NODE', name: 'Raspberry Pi 5 Staking Cluster', category: 'Hardware / Tech', defaultPrice: '280.00' },
  { symbol: 'CTG', name: 'Hardware Cartridge Module', category: 'Hardware / Tech', defaultPrice: '100.25' },
  { symbol: 'CUSTOM', name: 'Custom Ticker Symbol...', category: 'General', defaultPrice: '' },
];

export default function SellerProducts() {
  const dispatch = useDispatch();
  const { products, loading, error, successMessage } = useSelector(state => state.seller);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [togglingId, setTogglingId] = useState(null);
  const [selectedTickerOption, setSelectedTickerOption] = useState('');
  
  // Form State
  const initialFormState = {
    name: '',
    symbol: '',
    description: '',
    category: 'Hardware / Tech',
    price: '',
    stock: '',
    min_order_qty: 1,
    max_order_qty: 100,
    low_stock_threshold: 5,
    status: 'Active',
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    dispatch(fetchSellerProducts());
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => dispatch(clearSuccessMessage()), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const openModal = (product = null) => {
    setFormErrors({});
    if (product) {
      setEditingProduct(product);
      const isKnown = TICKER_OPTIONS.some(o => o.symbol === product.symbol);
      setSelectedTickerOption(isKnown ? product.symbol : 'CUSTOM');
      setFormData({
        name: product.name || '',
        symbol: product.symbol || '',
        description: product.description || '',
        category: product.category || 'Hardware / Tech',
        price: product.price ?? '',
        stock: product.stock ?? '',
        min_order_qty: product.min_order_qty || 1,
        max_order_qty: product.max_order_qty || 100,
        low_stock_threshold: product.low_stock_threshold || 5,
        status: product.status || 'Active',
      });
    } else {
      setEditingProduct(null);
      setSelectedTickerOption('');
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setSelectedTickerOption('');
    setFormErrors({});
  };

  const handleTickerChange = (e) => {
    const val = e.target.value;
    setSelectedTickerOption(val);

    if (val === 'CUSTOM') {
      setFormData(prev => ({ ...prev, symbol: '' }));
    } else if (val) {
      const opt = TICKER_OPTIONS.find(o => o.symbol === val);
      if (opt) {
        setFormData(prev => ({
          ...prev,
          symbol: opt.symbol,
          name: (!prev.name || TICKER_OPTIONS.some(o => o.name === prev.name)) ? opt.name : prev.name,
          category: opt.category || prev.category,
          price: (!prev.price) ? opt.defaultPrice : prev.price,
        }));
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Product name is required.';
    if (!formData.symbol.trim()) errors.symbol = 'Please choose or enter a ticker symbol.';
    
    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) errors.price = 'Price must be greater than 0.';
    
    const stockNum = parseInt(formData.stock, 10);
    if (isNaN(stockNum) || stockNum < 0) errors.stock = 'Stock cannot be negative.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      symbol: formData.symbol.trim().toUpperCase(),
      description: formData.description.trim(),
      category: formData.category,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
      min_order_qty: parseInt(formData.min_order_qty, 10) || 1,
      max_order_qty: parseInt(formData.max_order_qty, 10) || 100,
      low_stock_threshold: parseInt(formData.low_stock_threshold, 10) || 5,
      status: formData.status,
    };

    if (editingProduct) {
      await dispatch(updateProduct({ id: editingProduct.id, updates: payload }));
    } else {
      await dispatch(createProduct(payload));
    }
    closeModal();
    dispatch(fetchSellerProducts());
  };

  // Toggle Active / Inactive status
  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'Active' ? 'Inactive' : 'Active';
    setTogglingId(product.id);
    try {
      await dispatch(toggleProductStatus({ id: product.id, status: newStatus })).unwrap();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const productsList = Array.isArray(products) ? products : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 relative">
      {/* Header with Title and Add Product Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Products</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage your product catalog. Activate products to stock and adjust them in Inventory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/seller/inventory"
            className="inline-flex items-center gap-2 bg-surface hover:bg-border/60 border border-border text-gray-200 hover:text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-all"
          >
            <Boxes size={16} className="text-primary" />
            <span>Go to Inventory</span>
          </Link>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-sm transition-all"
          >
            <Plus size={18} />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-success/10 border border-success/30 text-success text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => dispatch(clearSuccessMessage())} className="text-success/80 hover:text-success">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {error && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => dispatch(clearError())} className="text-danger/80 hover:text-danger">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Products Table Container */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a]/70">
              <tr className="text-gray-400 border-b border-border text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold">Symbol</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-right">Price</th>
                <th className="px-6 py-4 font-semibold text-right">Available Stock</th>
                <th className="px-6 py-4 font-semibold text-right">Locked</th>
                <th className="px-6 py-4 font-semibold text-center">Status / Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading && productsList.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-36 bg-border rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-border rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-border rounded"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-16 bg-border rounded ml-auto"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-border rounded ml-auto"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-8 bg-border rounded ml-auto"></div></td>
                    <td className="px-6 py-4 text-center"><div className="h-6 w-20 bg-border rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : productsList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-border/40 text-gray-400 flex items-center justify-center mx-auto">
                        <Package size={24} />
                      </div>
                      <h3 className="font-semibold text-white text-base">No products listed yet</h3>
                      <p className="text-gray-400 text-xs">Start selling by adding your first product with pricing and initial stock.</p>
                      <button
                        onClick={() => openModal()}
                        className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Plus size={14} /> + Add Product
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                productsList.map((p) => {
                  const threshold = p.low_stock_threshold || 5;
                  const isLow = Number(p.stock) <= threshold && Number(p.stock) > 0;
                  const isOut = Number(p.stock) <= 0;
                  const isActive = p.status === 'Active';

                  return (
                    <tr key={p.id} className="hover:bg-border/20 transition-colors group">
                      {/* Product Name */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {p.name}
                        </div>
                        {isLow && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-warning font-medium mt-0.5">
                            <AlertTriangle size={11} /> Low stock — {p.stock} units remaining
                          </div>
                        )}
                        {isOut && (
                          <div className="text-[11px] text-danger font-medium mt-0.5">
                            Sold Out — Restock in Inventory
                          </div>
                        )}
                      </td>

                      {/* Symbol */}
                      <td className="px-6 py-4 font-mono text-xs text-gray-300 font-bold">{p.symbol}</td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Cpu size={11} />
                          {p.category || 'General'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 text-right font-bold text-white">
                        ${Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Available Stock */}
                      <td className="px-6 py-4 text-right">
                        <span className={`font-semibold ${isOut ? 'text-danger' : isLow ? 'text-warning' : 'text-white'}`}>
                          {p.stock}
                        </span>
                      </td>

                      {/* Locked Stock */}
                      <td className="px-6 py-4 text-right text-gray-400 font-mono">
                        {p.locked || 0}
                      </td>

                      {/* Active / Inactive Toggle Button */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          disabled={togglingId === p.id}
                          title={isActive ? 'Click to deactivate product' : 'Click to activate product'}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/50'
                              : 'bg-gray-500/15 text-gray-400 border border-gray-500/30 hover:bg-gray-500/25 hover:border-gray-500/50'
                          } ${togglingId === p.id ? 'opacity-60 cursor-wait' : ''}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                          <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
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

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-border bg-[#0f172a]/50">
              <div>
                <h3 className="font-bold text-lg text-white">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Set product details and ticker symbol options.
                </p>
              </div>
              <button 
                onClick={closeModal} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-border/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Ticker Symbol Dropdown & Product Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Ticker Symbol <span className="text-danger">*</span>
                  </label>
                  <select
                    value={selectedTickerOption}
                    onChange={handleTickerChange}
                    className={`w-full bg-background border ${formErrors.symbol ? 'border-danger' : 'border-border'} rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono cursor-pointer`}
                  >
                    <option value="">-- Select Ticker Symbol --</option>
                    {TICKER_OPTIONS.map(opt => (
                      <option key={opt.symbol} value={opt.symbol}>
                        {opt.symbol === 'CUSTOM' ? opt.name : `${opt.symbol} — ${opt.name}`}
                      </option>
                    ))}
                  </select>

                  {selectedTickerOption === 'CUSTOM' && (
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                      className="mt-2 w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors uppercase font-mono"
                      placeholder="e.g. YUBI-5C, RACK-01"
                      autoFocus
                    />
                  )}
                  {formErrors.symbol && <p className="text-danger text-[11px] mt-1">{formErrors.symbol}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Product Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full bg-background border ${formErrors.name ? 'border-danger' : 'border-border'} rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors`}
                    placeholder="e.g. Enterprise Edge Validator Rack"
                  />
                  {formErrors.name && <p className="text-danger text-[11px] mt-1">{formErrors.name}</p>}
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="Active">Active (Ready in Inventory & Market)</option>
                    <option value="Inactive">Inactive (Hidden / Paused)</option>
                  </select>
                </div>
              </div>

              {/* Price & Initial Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Price (USD / USDT) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className={`w-full bg-background border ${formErrors.price ? 'border-danger' : 'border-border'} rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors`}
                    placeholder="279.00"
                  />
                  {formErrors.price && <p className="text-danger text-[11px] mt-1">{formErrors.price}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Initial Stock Units <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className={`w-full bg-background border ${formErrors.stock ? 'border-danger' : 'border-border'} rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors`}
                    placeholder="50"
                  />
                  {formErrors.stock && <p className="text-danger text-[11px] mt-1">{formErrors.stock}</p>}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Product Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors resize-none"
                  placeholder="Provide hardware specifications, model details, or service scope..."
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg shadow-sm transition-all"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
