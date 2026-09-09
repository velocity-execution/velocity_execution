import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchSellerWallet, 
  fetchWalletTransactions, 
  fetchWithdrawals, 
  requestWithdrawal,
  clearSuccessMessage,
  clearError
} from '../store/sellerSlice';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Check, 
  Lock, 
  Percent, 
  ArrowRight 
} from 'lucide-react';

export default function SellerWallet() {
  const dispatch = useDispatch();
  const { wallet, transactions, withdrawals, walletLoading, successMessage, error } = useSelector((state) => state.seller);

  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'payouts'
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    method: 'USDT (TRC-20)',
    accountInfo: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    dispatch(fetchSellerWallet());
    dispatch(fetchWalletTransactions());
    dispatch(fetchWithdrawals());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchSellerWallet());
    dispatch(fetchWalletTransactions());
    dispatch(fetchWithdrawals());
  };

  const availableBalance = Number(wallet?.availableBalance ?? 0);
  const pendingBalance = Number(wallet?.pendingBalance ?? 0);
  const totalEarnings = Number(wallet?.totalEarnings ?? 0);
  const platformFees = Number(wallet?.platformFees ?? 0);
  const netEarnings = Number(wallet?.netEarnings ?? totalEarnings);

  const handleQuickPercent = (pct) => {
    const val = (availableBalance * pct).toFixed(2);
    setWithdrawForm(prev => ({ ...prev, amount: val }));
    setFormError('');
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const amt = parseFloat(withdrawForm.amount);

    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid withdrawal amount greater than 0.');
      return;
    }

    if (amt > availableBalance) {
      setFormError(`Withdrawal amount exceeds your available balance of $${availableBalance.toFixed(2)}.`);
      return;
    }

    if (!withdrawForm.accountInfo.trim()) {
      setFormError('Please provide your recipient wallet address or bank account details.');
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(requestWithdrawal({
        amount: amt,
        method: withdrawForm.method,
        accountInfo: withdrawForm.accountInfo.trim(),
      })).unwrap();

      setWithdrawModalOpen(false);
      setWithdrawForm({ amount: '', method: 'USDT (TRC-20)', accountInfo: '' });
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Failed to request withdrawal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status = '') => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 size={11} /> Completed
        </span>
      );
    }
    if (s === 'pending' || s === 'processing') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock size={11} /> Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <XCircle size={11} /> {status || 'Failed'}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast / Global Alerts */}
      {successMessage && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center justify-between text-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => dispatch(clearSuccessMessage())} className="text-emerald-400/80 hover:text-emerald-300">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-center justify-between text-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => dispatch(clearError())} className="text-rose-400/80 hover:text-rose-300">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Wallet className="text-primary" size={26} />
            Seller Wallet & Earnings
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time balance settlement, lifetime sales revenue, and fast payouts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-border/60 border border-border text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} className={walletLoading ? 'animate-spin text-primary' : ''} />
            Refresh
          </button>
          <button
            onClick={() => {
              setFormError('');
              setWithdrawModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-black font-semibold rounded-lg text-sm transition-colors shadow-md shadow-primary/20"
          >
            <ArrowUpRight size={16} />
            Request Payout
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="bg-surface rounded-xl p-5 border border-primary/40 bg-gradient-to-br from-surface to-primary/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Available for Payout</span>
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3 font-mono">
            ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <ShieldCheck size={13} /> Ready for instant withdrawal
          </p>
        </div>

        {/* Pending / Escrow Balance */}
        <div className="bg-surface rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">In-Escrow / Pending</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-400 mt-3 font-mono">
            ${pendingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Lock size={12} /> Held in active orders
          </p>
        </div>

        {/* Total Lifetime Earnings */}
        <div className="bg-surface rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Total Sales Volume</span>
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-gray-300">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3 font-mono">
            ${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Gross customer payments
          </p>
        </div>

        {/* Platform Fees & Net */}
        <div className="bg-surface rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Net Realized</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-3 font-mono">
            ${netEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Fee rate: <span className="text-emerald-400 font-semibold">0.00%</span> promo rate
          </p>
        </div>
      </div>

      {/* Tabs and History Section */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-background/60 px-6 pt-3 gap-6">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'transactions'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <CreditCard size={16} />
            Wallet Ledger & Transactions
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-gray-300">
              {transactions?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'payouts'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <ArrowUpRight size={16} />
            Payout Requests & History
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-gray-300">
              {withdrawals?.length || 0}
            </span>
          </button>
        </div>

        {/* Tab 1: Wallet Transactions */}
        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-background/80 text-gray-400 border-b border-border text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-6 font-semibold">Tx ID</th>
                  <th className="py-3.5 px-6 font-semibold">Type</th>
                  <th className="py-3.5 px-6 font-semibold">Description</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Amount</th>
                  <th className="py-3.5 px-6 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {Array.isArray(transactions) && transactions.length > 0 ? (
                  transactions.map((tx) => {
                    const isCredit = ['sale', 'deposit', 'escrow_release'].includes((tx.type || '').toLowerCase());
                    return (
                      <tr key={tx.id} className="hover:bg-border/20 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs text-primary font-medium">
                          {tx.id}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded text-xs font-semibold uppercase ${
                            isCredit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {tx.type || 'Transaction'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-300 font-medium">
                          {tx.description || 'Wallet balance adjustment'}
                        </td>
                        <td className={`py-4 px-6 text-right font-mono font-bold text-sm ${
                          isCredit ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isCredit ? '+' : '-'}${Math.abs(Number(tx.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {getStatusBadge(tx.status || 'Completed')}
                        </td>
                        <td className="py-4 px-6 text-right text-xs text-gray-400 font-mono">
                          {new Date(tx.created_at || Date.now()).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-gray-400">
                      <CreditCard size={36} className="mx-auto text-gray-600 mb-2" />
                      <p className="text-base font-medium text-gray-300">No transactions recorded yet</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Earnings from product sales will be credited here automatically.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Payout Requests */}
        {activeTab === 'payouts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-background/80 text-gray-400 border-b border-border text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-6 font-semibold">Payout ID</th>
                  <th className="py-3.5 px-6 font-semibold">Method</th>
                  <th className="py-3.5 px-6 font-semibold">Destination Account</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Requested Amount</th>
                  <th className="py-3.5 px-6 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Requested At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {Array.isArray(withdrawals) && withdrawals.length > 0 ? (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-border/20 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs text-primary font-medium">
                        {w.id}
                      </td>
                      <td className="py-4 px-6 text-white font-medium">
                        {w.method || 'USDT TRC20'}
                      </td>
                      <td className="py-4 px-6 text-gray-300 font-mono text-xs truncate max-w-xs">
                        {w.account_info || w.accountInfo || 'Default Linked Wallet'}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-white">
                        ${Number(w.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {getStatusBadge(w.status || 'Pending')}
                      </td>
                      <td className="py-4 px-6 text-right text-xs text-gray-400 font-mono">
                        {new Date(w.created_at || Date.now()).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-gray-400">
                      <ArrowUpRight size={36} className="mx-auto text-gray-600 mb-2" />
                      <p className="text-base font-medium text-gray-300">No payout requests</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Use the "Request Payout" button above to withdraw your available balance.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdrawal / Payout Modal */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <ArrowUpRight className="text-primary" size={20} />
                  Request Balance Payout
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Transfer funds from Velocity Seller balance to your external account
                </p>
              </div>
              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-border/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleWithdrawSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-lg text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Available Balance Callout */}
              <div className="p-3.5 bg-background border border-border rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400">Available Payout Balance:</span>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                    ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-gray-400">Payout Currency:</span>
                  <div className="text-sm font-semibold text-white mt-0.5">USDT / USD</div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Withdrawal Amount <span className="text-rose-400">*</span>
                  </label>
                  {/* Quick percentage buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(0.25)}
                      className="px-2 py-0.5 rounded bg-background hover:bg-border text-xs text-gray-300 font-mono"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(0.5)}
                      className="px-2 py-0.5 rounded bg-background hover:bg-border text-xs text-gray-300 font-mono"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(1.0)}
                      className="px-2 py-0.5 rounded bg-primary/20 hover:bg-primary/30 text-primary font-bold text-xs font-mono"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={availableBalance}
                    required
                    placeholder="0.00"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full pl-8 pr-4 py-2 bg-background border border-border rounded-lg text-white font-mono text-base placeholder-gray-500 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Payout Method */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Payout Method <span className="text-rose-400">*</span>
                </label>
                <select
                  value={withdrawForm.method}
                  onChange={(e) => setWithdrawForm(prev => ({ ...prev, method: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="USDT (TRC-20)">USDT (TRC-20 Network) — Instant Settlement</option>
                  <option value="USDT (ERC-20)">USDT (Ethereum Network)</option>
                  <option value="Bank Wire Transfer">International / Domestic Bank Wire</option>
                </select>
              </div>

              {/* Recipient Account Details */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Recipient Address or Account Details <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    withdrawForm.method.includes('USDT')
                      ? 'e.g. Txyz... (TRC20 Wallet Address)'
                      : 'e.g. IBAN / Routing #, Account #, Full Legal Name'
                  }
                  value={withdrawForm.accountInfo}
                  onChange={(e) => setWithdrawForm(prev => ({ ...prev, accountInfo: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary font-mono"
                />
              </div>

              {/* Summary breakdown */}
              <div className="p-3 bg-background border border-border rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Gross Payout:</span>
                  <span className="font-mono text-white">${Number(withdrawForm.amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Processing Fee:</span>
                  <span className="font-mono text-emerald-400">$0.00 (0% Promo)</span>
                </div>
                <div className="pt-1.5 border-t border-border flex justify-between font-bold text-sm text-white">
                  <span>Net Receiving Amount:</span>
                  <span className="font-mono text-emerald-400 text-base">${Number(withdrawForm.amount || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setWithdrawModalOpen(false)}
                  className="px-4 py-2 bg-surface hover:bg-border/60 border border-border text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !withdrawForm.amount || Number(withdrawForm.amount) <= 0 || Number(withdrawForm.amount) > availableBalance}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg text-sm transition-colors flex items-center gap-1.5 shadow-md shadow-primary/20"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
