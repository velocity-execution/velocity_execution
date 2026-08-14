import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWallets } from '../store/walletSlice';
import { walletApi } from '../api/walletApi';
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, X } from 'lucide-react';

export default function Wallet() {
  const dispatch = useDispatch();
  const { balances, loading, error } = useSelector(state => state.wallet);
  
  const [modalState, setModalState] = useState({ isOpen: false, type: null, asset: null });
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    dispatch(fetchWallets());
  }, [dispatch]);

  const openModal = (type, asset) => {
    setModalState({ isOpen: true, type, asset });
    setAmount('');
    setSubmitError('');
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, asset: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setSubmitError('Please enter a valid positive amount.');
      return;
    }

    if (modalState.type === 'withdraw') {
      const balance = balances.find(b => b.asset === modalState.asset);
      if (balance && parseFloat(amount) > balance.available) {
        setSubmitError('Insufficient available balance.');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      if (modalState.type === 'deposit') {
        await walletApi.deposit({ asset: modalState.asset, amount: parseFloat(amount) });
      } else {
        await walletApi.withdraw({ asset: modalState.asset, amount: parseFloat(amount) });
      }
      dispatch(fetchWallets());
      closeModal();
    } catch (err) {
      setSubmitError(err.message || 'An error occurred during the transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalValue = (Array.isArray(balances) ? balances : [])?.reduce((acc, b) => acc + (b.available + b.locked), 0) || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-6 rounded-lg border border-border">
        <div>
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <WalletIcon size={20} />
            <h1 className="font-medium text-lg text-white">Estimated Balance</h1>
          </div>
          {loading && balances.length === 0 ? (
            <div className="h-10 w-48 bg-border animate-pulse rounded mt-2"></div>
          ) : (
            <div className="text-4xl font-bold">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-[#0f172a]/30">
          <h2 className="font-medium">Assets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a]/50">
              <tr className="text-gray-400 border-b border-border">
                <th className="px-6 py-4 font-medium">Asset</th>
                <th className="px-6 py-4 font-medium text-right">Available</th>
                <th className="px-6 py-4 font-medium text-right">Locked</th>
                <th className="px-6 py-4 font-medium text-right">Total</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && balances.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Loading balances...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-danger">
                    Failed to load balances: {error}
                  </td>
                </tr>
              ) : balances.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No balances available
                  </td>
                </tr>
              ) : (
                balances.map((b) => (
                  <tr key={b.asset} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      {b.asset}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {b.available.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">
                      {b.locked.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      {(b.available + b.locked).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => openModal('deposit', b.asset)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 hover:bg-success/20 px-3 py-1.5 rounded transition-colors"
                      >
                        <ArrowDownToLine size={12} /> Deposit
                      </button>
                      <button 
                        onClick={() => openModal('withdraw', b.asset)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-white bg-border hover:bg-border/80 px-3 py-1.5 rounded transition-colors"
                      >
                        <ArrowUpFromLine size={12} /> Withdraw
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h3 className="font-bold text-lg capitalize">
                {modalState.type} {modalState.asset}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {submitError && (
                <div className="bg-danger/10 border border-danger/50 text-danger text-sm p-3 rounded">
                  {submitError}
                </div>
              )}
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-400 font-medium">
                    {modalState.asset}
                  </div>
                </div>
              </div>
              
              {modalState.type === 'withdraw' && (
                <div className="text-xs text-gray-400 flex justify-between">
                  <span>Available Balance:</span>
                  <span className="text-white font-medium">
                    {balances.find(b => b.asset === modalState.asset)?.available.toLocaleString() || '0'} {modalState.asset}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 rounded-md font-medium text-white transition-colors ${
                  modalState.type === 'deposit' 
                    ? 'bg-success hover:bg-success/90 disabled:bg-success/50' 
                    : 'bg-primary hover:bg-primary/90 disabled:bg-primary/50'
                }`}
              >
                {isSubmitting ? 'Processing...' : `Confirm ${modalState.type === 'deposit' ? 'Deposit' : 'Withdrawal'}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
