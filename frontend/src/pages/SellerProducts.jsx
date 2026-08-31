import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSellerProducts, createProduct, updateProduct, deleteProduct } from '../store/sellerSlice';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

export default function SellerProducts() {
  const dispatch = useDispatch();
  const { products, loading } = useSelector(state => state.seller);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', symbol: '', price: '', stock: '' });

  useEffect(() => {
    dispatch(fetchSellerProducts());
  }, [dispatch]);

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ name: product.name, symbol: product.symbol, price: product.price, stock: product.stock });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', symbol: '', price: '', stock: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      symbol: formData.symbol.toUpperCase(),
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10)
    };

    if (editingProduct) {
      await dispatch(updateProduct({ id: editingProduct.id, updates: payload }));
    } else {
      await dispatch(createProduct(payload));
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      dispatch(deleteProduct(id));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Products</h1>

      </div>

      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a]/50">
              <tr className="text-gray-400 border-b border-border">
                <th className="px-6 py-4 font-medium">Product Name</th>
                <th className="px-6 py-4 font-medium">Symbol</th>
                <th className="px-6 py-4 font-medium text-right">Price</th>
                <th className="px-6 py-4 font-medium text-right">Available Stock</th>
                <th className="px-6 py-4 font-medium text-right">Locked Stock</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && products.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading products...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No products found. Create one!</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{p.name}</td>
                    <td className="px-6 py-4 text-gray-400">{p.symbol}</td>
                    <td className="px-6 py-4 text-right font-medium">${p.price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">{p.stock}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{p.locked || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                        p.status === 'Active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => openModal(p)} className="text-info hover:text-white transition-colors" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-danger hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h3 className="font-bold text-lg capitalize">
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="e.g. VIP Subscription"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Ticker Symbol</label>
                <input
                  type="text"
                  required
                  value={formData.symbol}
                  onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors uppercase"
                  placeholder="e.g. VIP_SUB"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-md font-medium text-gray-300 bg-background border border-border hover:bg-border/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-md font-medium text-white bg-primary hover:bg-primary/90 transition-colors"
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
