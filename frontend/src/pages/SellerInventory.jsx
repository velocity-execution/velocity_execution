import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchSellerInventory, 
  addStock, 
  adjustStock, 
  fetchInventoryHistory,
  toggleProductStatus
} from '../store/sellerSlice';
import { 
  Layers, 
  Search, 
  Plus, 
  Sliders, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  RefreshCw, 
  Lock, 
  Boxes, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  Check 
} from 'lucide-react';

export default function SellerInventory() {
  const dispatch = useDispatch();
  const { inventory, inventoryLoading, inventoryHistory } = useSelector((state) => state.seller);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterHealth, setFilterHealth] = useState('All'); // All, Active, Inactive, Healthy, Low Stock, Depleted

  // Modals state
  const [addStockModal, setAddStockModal] = useState({ open: false, product: null, quantity: '', reason: '' });
  const [adjustStockModal, setAdjustStockModal] = useState({ open: false, product: null, newStock: '', reason: 'Physical count correction' });
  const [historyModal, setHistoryModal] = useState({ open: false, product: null });
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    dispatch(fetchSellerInventory());
  }, [dispatch]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleQuickActivate = async (item) => {
    try {
      await dispatch(toggleProductStatus({ id: item.product_id, status: 'Active' })).unwrap();
      showToast(`Activated ${item.name}! You can now add and adjust stock.`);
    } catch (err) {
      showToast(`Failed to activate: ${err}`);
    }
  };

  // Metrics summary
  const summary = useMemo(() => {
    const list = Array.isArray(inventory) ? inventory : [];
    let totalAvail = 0;
    let totalLocked = 0;
    let lowStockCount = 0;
    let activeCount = 0;

    list.forEach(item => {
      const avail = Number(item.available_stock || 0);
      const locked = Number(item.locked_stock || 0);
      const threshold = Number(item.low_stock_threshold || 5);

      totalAvail += avail;
      totalLocked += locked;
      if (item.status === 'Active') {
        activeCount++;
      }
      if (avail <= threshold) {
        lowStockCount++;
      }
    });

    return {
      totalProducts: list.length,
      activeProducts: activeCount,
      availableUnits: totalAvail,
      lockedUnits: totalLocked,
      lowStockCount,
    };
  }, [inventory]);

  // Filtered List
  const filteredInventory = useMemo(() => {
    let list = Array.isArray(inventory) ? [...inventory] : [];

    if (filterHealth !== 'All') {
      list = list.filter(item => {
        if (filterHealth === 'Active') return item.status === 'Active';
        if (filterHealth === 'Inactive') return item.status !== 'Active';
        const avail = Number(item.available_stock || 0);
        const threshold = Number(item.low_stock_threshold || 5);
        if (filterHealth === 'Low Stock') return avail > 0 && avail <= threshold;
        if (filterHealth === 'Depleted') return avail === 0;
        if (filterHealth === 'Healthy') return avail > threshold;
        return true;
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.symbol && item.symbol.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    }

    return list;
  }, [inventory, filterHealth, searchTerm]);

  // Handlers for Add Stock
  const handleOpenAddStock = (item) => {
    setAddStockModal({
      open: true,
      product: item,
      quantity: '',
      reason: 'Standard Supplier Restock'
    });
  };

  const handleConfirmAddStock = async (e) => {
    e.preventDefault();
    const qty = parseInt(addStockModal.quantity, 10);
    if (!qty || qty <= 0) return;

    setSubmitting(true);
    try {
      await dispatch(addStock({
        productId: addStockModal.product.product_id,
        quantity: qty,
        reason: addStockModal.reason
      })).unwrap();
      showToast(`Successfully added ${qty} units to ${addStockModal.product.name}`);
      setAddStockModal({ open: false, product: null, quantity: '', reason: '' });
    } catch (err) {
      showToast(`Error: ${err || 'Failed to add stock'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for Adjust Stock
  const handleOpenAdjustStock = (item) => {
    setAdjustStockModal({
      open: true,
      product: item,
      newStock: String(item.available_stock || 0),
      reason: 'Physical inventory audit'
    });
  };

  const handleConfirmAdjustStock = async (e) => {
    e.preventDefault();
    const newStockNum = parseInt(adjustStockModal.newStock, 10);
    if (isNaN(newStockNum) || newStockNum < 0) return;

    setSubmitting(true);
    try {
      await dispatch(adjustStock({
        productId: adjustStockModal.product.product_id,
        newStock: newStockNum,
        reason: adjustStockModal.reason
      })).unwrap();
      showToast(`Stock updated to ${newStockNum} units for ${adjustStockModal.product.name}`);
      setAdjustStockModal({ open: false, product: null, newStock: '', reason: '' });
    } catch (err) {
      showToast(`Error: ${err || 'Failed to adjust stock'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for History
  const handleOpenHistory = (item) => {
    setHistoryModal({ open: true, product: item });
    dispatch(fetchInventoryHistory(item.product_id));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-black px-4 py-2.5 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <Check size={16} />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Boxes className="text-primary" size={26} />
            Inventory Management
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Monitor real-time warehouse counts, reserved units, and restock thresholds
          </p>
        </div>
        <button
          onClick={() => dispatch(fetchSellerInventory())}
          className="flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-border/60 border border-border text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw size={14} className={inventoryLoading ? 'animate-spin text-primary' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-5 border border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Cataloged Items</span>
            <div className="text-2xl font-bold text-white mt-1.5">{summary.totalProducts}</div>
            <span className="text-xs text-gray-400 mt-1 block">
              <span className="text-emerald-400 font-semibold">{summary.activeProducts || 0} active</span> • {(summary.totalProducts - (summary.activeProducts || 0))} inactive
            </span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Package size={24} />
          </div>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Available Units</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1.5">{summary.availableUnits.toLocaleString()}</div>
            <span className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 size={13} /> Ready for instant dispatch
            </span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Boxes size={24} />
          </div>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Locked Units</span>
            <div className="text-2xl font-bold text-amber-400 mt-1.5">{summary.lockedUnits.toLocaleString()}</div>
            <span className="text-xs text-amber-400 flex items-center gap-1 mt-1">
              <Lock size={13} /> In checkout / order holds
            </span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Lock size={24} />
          </div>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Low Stock Warnings</span>
            <div className={`text-2xl font-bold mt-1.5 ${summary.lowStockCount > 0 ? 'text-rose-400' : 'text-gray-300'}`}>
              {summary.lowStockCount}
            </div>
            <span className={`text-xs mt-1 flex items-center gap-1 ${summary.lowStockCount > 0 ? 'text-rose-400' : 'text-gray-400'}`}>
              <AlertTriangle size={13} /> {summary.lowStockCount > 0 ? 'Attention required' : 'All thresholds healthy'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${summary.lowStockCount > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-surface text-gray-400 border border-border'}`}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-surface rounded-xl p-4 border border-border flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Health Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-background/60 rounded-lg border border-border/50">
          {['All', 'Active', 'Inactive', 'Healthy', 'Low Stock', 'Depleted'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterHealth(tab)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                filterHealth === tab
                  ? 'bg-primary text-black font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-surface'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by product name, symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background/80 text-gray-400 border-b border-border text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Product</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-center">Available Units</th>
                <th className="py-3.5 px-4 font-semibold text-center">Locked Units</th>
                <th className="py-3.5 px-4 font-semibold text-center">Total Units</th>
                <th className="py-3.5 px-4 font-semibold text-center">Alert Threshold</th>
                <th className="py-3.5 px-4 font-semibold text-center">Stock Health</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {inventoryLoading && filteredInventory.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-5 w-40 bg-border/60 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-border/60 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-5 w-16 bg-border/60 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-5 w-12 bg-border/60 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-5 w-12 bg-border/60 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-5 w-12 bg-border/60 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-10 bg-border/60 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-border/60 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-7 w-32 bg-border/60 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredInventory.length > 0 ? (
                filteredInventory.map((item) => {
                  const avail = Number(item.available_stock || 0);
                  const locked = Number(item.locked_stock || 0);
                  const total = avail + locked;
                  const threshold = Number(item.low_stock_threshold || 5);
                  const isDepleted = avail === 0;
                  const isLow = avail > 0 && avail <= threshold;
                  const isActive = item.status === 'Active';

                  return (
                    <tr key={item.product_id} className="hover:bg-border/20 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center text-xs font-bold text-primary">
                            {item.symbol?.slice(0, 3) || 'SKU'}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{item.name}</div>
                            <div className="text-xs text-gray-400 font-mono">{item.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded bg-background text-gray-300 text-xs border border-border">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/15 text-gray-400 border border-gray-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`text-base font-bold font-mono ${isDepleted ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {avail}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-mono text-gray-400 font-medium">
                          {locked}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-mono font-semibold text-white">
                        {total}
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-xs text-gray-400">
                        ≤ {threshold}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isDepleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <AlertTriangle size={11} /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <AlertTriangle size={11} /> Low Stock ({avail} left)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 size={11} /> Healthy
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {isActive ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAddStock(item)}
                              title="Add stock units"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-xs font-medium transition-colors cursor-pointer"
                            >
                              <Plus size={12} /> Add
                            </button>
                            <button
                              onClick={() => handleOpenAdjustStock(item)}
                              title="Adjust total stock count"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-background hover:bg-border border border-border text-xs font-medium text-gray-300 hover:text-white transition-colors cursor-pointer"
                            >
                              <Sliders size={12} /> Adjust
                            </button>
                            <button
                              onClick={() => handleOpenHistory(item)}
                              title="View stock audit history"
                              className="p-1.5 rounded bg-background hover:bg-border border border-border text-gray-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <History size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleQuickActivate(item)}
                              title="Activate product to enable adding and adjusting stock"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
                            >
                              <CheckCircle2 size={12} /> Activate
                            </button>
                            <button
                              onClick={() => handleOpenHistory(item)}
                              title="View stock audit history"
                              className="p-1.5 rounded bg-background hover:bg-border border border-border text-gray-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <History size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <Boxes size={36} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-base font-medium text-gray-300">No inventory matches found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {searchTerm || filterHealth !== 'All' 
                        ? 'Try modifying your search or inventory filter' 
                        : 'Your inventory will appear here once products are created'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add Stock */}
      {addStockModal.open && addStockModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Plus className="text-primary" size={18} />
                  Add Stock Units
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Restock {addStockModal.product.name} ({addStockModal.product.symbol})
                </p>
              </div>
              <button
                onClick={() => setAddStockModal({ open: false, product: null, quantity: '', reason: '' })}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-border/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmAddStock} className="p-5 space-y-4">
              <div className="p-3 bg-background border border-border rounded-lg flex items-center justify-between text-xs">
                <span className="text-gray-400">Current Available Stock:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{addStockModal.product.available_stock || 0} units</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Units to Add <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 50"
                  value={addStockModal.quantity}
                  onChange={(e) => setAddStockModal(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Reason / Source Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received shipment from warehouse"
                  value={addStockModal.reason}
                  onChange={(e) => setAddStockModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
              </div>

              {Number(addStockModal.quantity) > 0 && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary flex items-center justify-between font-medium">
                  <span>New Available Stock:</span>
                  <span className="font-mono text-sm font-bold">
                    {(Number(addStockModal.product.available_stock || 0) + Number(addStockModal.quantity))} units
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAddStockModal({ open: false, product: null, quantity: '', reason: '' })}
                  className="px-4 py-2 bg-surface hover:bg-border/60 border border-border text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !addStockModal.quantity || Number(addStockModal.quantity) <= 0}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg text-sm transition-colors flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Adjust Stock */}
      {adjustStockModal.open && adjustStockModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Sliders className="text-primary" size={18} />
                  Adjust Stock Count
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Set exact inventory level for {adjustStockModal.product.name}
                </p>
              </div>
              <button
                onClick={() => setAdjustStockModal({ open: false, product: null, newStock: '', reason: '' })}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-border/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjustStock} className="p-5 space-y-4">
              <div className="p-3 bg-background border border-border rounded-lg flex items-center justify-between text-xs">
                <span className="text-gray-400">Current Recorded Stock:</span>
                <span className="font-mono font-bold text-white text-sm">{adjustStockModal.product.available_stock || 0} units</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  New Exact Stock Count <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={adjustStockModal.newStock}
                  onChange={(e) => setAdjustStockModal(prev => ({ ...prev, newStock: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Adjustment Reason <span className="text-rose-400">*</span>
                </label>
                <select
                  value={adjustStockModal.reason}
                  onChange={(e) => setAdjustStockModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="Physical count correction">Physical count correction</option>
                  <option value="Damaged or expired inventory">Damaged or expired inventory</option>
                  <option value="Returned to supplier">Returned to supplier</option>
                  <option value="Manual audit adjustment">Manual audit adjustment</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {adjustStockModal.newStock !== '' && (
                <div className="p-3 bg-background border border-border rounded-lg text-xs flex items-center justify-between">
                  <span className="text-gray-400">Inventory Difference:</span>
                  {(() => {
                    const diff = Number(adjustStockModal.newStock) - Number(adjustStockModal.product.available_stock || 0);
                    if (diff > 0) {
                      return <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">+{diff} units <ArrowUpRight size={13} /></span>;
                    }
                    if (diff < 0) {
                      return <span className="font-mono text-rose-400 font-bold flex items-center gap-1">{diff} units <ArrowDownRight size={13} /></span>;
                    }
                    return <span className="font-mono text-gray-400 font-bold">No change</span>;
                  })()}
                </div>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAdjustStockModal({ open: false, product: null, newStock: '', reason: '' })}
                  className="px-4 py-2 bg-surface hover:bg-border/60 border border-border text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || adjustStockModal.newStock === ''}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg text-sm transition-colors flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Inventory History Audit */}
      {historyModal.open && historyModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <History className="text-primary" size={18} />
                  Stock Audit Trail
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Audit logs for {historyModal.product.name} ({historyModal.product.symbol})
                </p>
              </div>
              <button
                onClick={() => setHistoryModal({ open: false, product: null })}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-border/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {Array.isArray(inventoryHistory) && inventoryHistory.length > 0 ? (
                inventoryHistory.map((log, idx) => (
                  <div key={log.id || idx} className="p-3.5 bg-background border border-border rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{log.change_type || 'Stock Change'}</span>
                      <span className="text-gray-500 font-mono">
                        {new Date(log.created_at || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Reason: <span className="text-gray-300">{log.reason || 'Not specified'}</span></span>
                      {log.quantity !== undefined && (
                        <span className={`font-mono font-bold ${log.quantity >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {log.quantity >= 0 ? `+${log.quantity}` : log.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <History size={32} className="mx-auto text-gray-600 mb-2" />
                  No inventory adjustment logs recorded yet.
                </div>
              )}
            </div>

            <div className="p-4 bg-background border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModal({ open: false, product: null })}
                className="px-4 py-2 bg-surface hover:bg-border border border-border rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
