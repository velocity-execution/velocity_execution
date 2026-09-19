import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWallets } from '../store/walletSlice';
import { walletApi } from '../api/walletApi';
import { paymentApi } from '../api/paymentApi';
import { openRazorpayCheckout } from '../utils/razorpay';
import { 
  Wallet as WalletIcon, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  X, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  Building2,
  Smartphone,
  ArrowLeftRight
} from 'lucide-react';

export default function Wallet() {
  const dispatch = useDispatch();
  const { balances, loading, error } = useSelector((state) => state.wallet);

  const balanceList = Array.isArray(balances) ? balances : [];

  // Dedicated Cash / INR Balance
  const inrWallet = balanceList.find((b) => b.asset?.toUpperCase() === 'INR') || {
    asset: 'INR',
    available: 0,
    locked: 0,
  };

  // Other crypto / asset holdings
  const assetList = balanceList.filter((b) => b.asset?.toUpperCase() !== 'INR');

  // Modals state
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);

  // Convert Form State (INR <-> USDT)
  const [convertFrom, setConvertFrom] = useState('INR');
  const [convertAmount, setConvertAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState('');
  const [convertSuccess, setConvertSuccess] = useState('');

  const convertTo = convertFrom === 'INR' ? 'USDT' : 'INR';
  const fromWallet = balanceList.find((b) => b.asset?.toUpperCase() === convertFrom) || { available: 0, locked: 0 };
  const toWallet = balanceList.find((b) => b.asset?.toUpperCase() === convertTo) || { available: 0, locked: 0 };

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState('');

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawType, setWithdrawType] = useState('upi'); // 'upi' or 'bank'
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [vpa, setVpa] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilter, setTxFilter] = useState('ALL');

  const loadTransactions = useCallback(async (filterType = 'ALL') => {
    setTxLoading(true);
    try {
      const res = await paymentApi.getTransactions({
        type: filterType !== 'ALL' ? filterType : undefined,
        limit: 15,
      });
      const data = res?.data || res;
      setTransactions(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
    } catch {
      // Fallback empty list on error
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    dispatch(fetchWallets());
    loadTransactions(txFilter);
  }, [dispatch, loadTransactions, txFilter]);

  // Handle Razorpay Deposit Flow
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    setDepositError('');
    setDepositSuccess('');

    const numAmount = parseFloat(depositAmount);
    if (!numAmount || numAmount <= 0) {
      setDepositError('Please enter a valid amount.');
      return;
    }

    setIsDepositing(true);
    try {
      // 1. Create order on backend
      const orderRes = await paymentApi.createOrder(numAmount);
      const orderData = orderRes?.data || orderRes;

      if (!orderData?.order_id) {
        throw new Error('Failed to initiate Razorpay order.');
      }

      // 2. Open Razorpay Checkout modal
      await openRazorpayCheckout({
        orderId: orderData.order_id,
        amount: orderData.amount,
        keyId: orderData.key_id,
        onSuccess: async (rzpResponse) => {
          try {
            // 3. Verify payment signature on backend
            await paymentApi.verifyPayment({
              razorpay_order_id: rzpResponse.razorpay_order_id,
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_signature: rzpResponse.razorpay_signature,
            });

            setDepositSuccess(`₹${numAmount.toLocaleString()} added to your wallet successfully!`);
            dispatch(fetchWallets());
            loadTransactions(txFilter);
            setTimeout(() => {
              setIsDepositOpen(false);
              setDepositSuccess('');
            }, 1800);
          } catch (verErr) {
            setDepositError(verErr.message || 'Payment verification failed.');
          } finally {
            setIsDepositing(false);
          }
        },
        onFailure: (err) => {
          setDepositError(err.description || err.message || 'Payment was cancelled or failed.');
          setIsDepositing(false);
        },
        onDismiss: () => {
          setIsDepositing(false);
        },
      });
    } catch (err) {
      setDepositError(err.message || 'Failed to start payment.');
      setIsDepositing(false);
    }
  };

  // Handle RazorpayX Withdrawal Request
  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    const numAmount = parseFloat(withdrawAmount);
    if (!numAmount || numAmount <= 0) {
      setWithdrawError('Please enter a valid positive amount.');
      return;
    }

    if (numAmount > inrWallet.available) {
      setWithdrawError(`Insufficient cash balance. Available: ₹${inrWallet.available.toLocaleString()}`);
      return;
    }

    if (withdrawType === 'upi' && !vpa.trim()) {
      setWithdrawError('Please enter a valid UPI ID (e.g. mobile@upi).');
      return;
    }

    if (withdrawType === 'bank' && (!accountNumber.trim() || !ifsc.trim())) {
      setWithdrawError('Please enter valid Bank Account Number and IFSC.');
      return;
    }

    setIsWithdrawing(true);
    try {
      await paymentApi.withdrawCash({
        amount: numAmount,
        account_type: withdrawType,
        account_number: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        vpa: vpa.trim(),
        name: accountName.trim() || 'Devon Miller',
      });

      setWithdrawSuccess('Withdrawal requested! Funds are locked and will be credited to your account via IMPS/UPI.');
      dispatch(fetchWallets());
      loadTransactions(txFilter);
      setTimeout(() => {
        setIsWithdrawOpen(false);
        setWithdrawSuccess('');
        setWithdrawAmount('');
      }, 2200);
    } catch (err) {
      setWithdrawError(err.message || 'Withdrawal request failed.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Convert currency handler
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    setConvertError('');
    setConvertSuccess('');

    const num = Math.floor(parseFloat(convertAmount));
    if (!num || num <= 0) {
      setConvertError('Please enter a valid positive whole number.');
      return;
    }

    if (num > fromWallet.available) {
      setConvertError(`Insufficient ${convertFrom} balance. You have ${fromWallet.available} available.`);
      return;
    }

    setIsConverting(true);
    try {
      await walletApi.convert({
        from_asset: convertFrom,
        to_asset: convertTo,
        amount: num,
      });
      setConvertSuccess(`Successfully converted ${num} ${convertFrom} to ${num} ${convertTo}!`);
      setConvertAmount('');
      dispatch(fetchWallets());
      setTimeout(() => {
        setIsConvertOpen(false);
        setConvertSuccess('');
      }, 1500);
    } catch (err) {
      setConvertError(err.message || 'Failed to convert currency.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. TOP HERO: DEDICATED FIAT CASH WALLET (INR) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-surface to-[#0f172a] p-6 rounded-2xl border border-indigo-500/30 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-medium text-sm tracking-wide uppercase">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                <IndianRupee size={16} className="text-indigo-400" />
              </span>
              <span>Fiat Cash Balance (INR)</span>
            </div>
            {loading && balanceList.length === 0 ? (
              <div className="h-12 w-56 bg-border/50 animate-pulse rounded-lg mt-2"></div>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  ₹{(inrWallet.available + inrWallet.locked).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Instant UPI / IMPS
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 pt-1">
              <div>
                Available Cash:{' '}
                <span className="text-emerald-400 font-semibold">
                  ₹{inrWallet.available.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-gray-600">•</span>
              <div>
                In Active Orders (Locked):{' '}
                <span className="text-amber-400 font-semibold">
                  ₹{inrWallet.locked.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setIsConvertOpen(true);
                setConvertError('');
                setConvertSuccess('');
                setConvertAmount('');
              }}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-lg shadow-indigo-900/30 text-sm"
            >
              <ArrowLeftRight size={18} />
              Convert INR ⇄ USDT
            </button>
            <button
              onClick={() => {
                setIsDepositOpen(true);
                setDepositError('');
                setDepositSuccess('');
              }}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-900/30 text-sm"
            >
              <ArrowDownToLine size={18} />
              Add Money (Razorpay)
            </button>
            <button
              onClick={() => {
                setIsWithdrawOpen(true);
                setWithdrawError('');
                setWithdrawSuccess('');
              }}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-gray-200 bg-surface border border-border hover:bg-border/60 hover:text-white active:scale-95 transition-all text-sm shadow-md"
            >
              <ArrowUpFromLine size={18} />
              Withdraw to Bank
            </button>
          </div>
        </div>
      </div>

      {/* 2. HOLDINGS / CRYPTO ASSETS TABLE */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-[#0f172a]/40 flex justify-between items-center">
          <div className="flex items-center gap-2 font-medium text-white">
            <WalletIcon size={18} className="text-gray-400" />
            <span>Asset Portfolio</span>
          </div>
          <span className="text-xs text-gray-400">Traded on Velocity internal books</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a]/60 text-gray-400 border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5 font-medium">Asset</th>
                <th className="px-6 py-3.5 font-medium text-right">Available</th>
                <th className="px-6 py-3.5 font-medium text-right">Locked in Orders</th>
                <th className="px-6 py-3.5 font-medium text-right">Total Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading && assetList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    Loading assets...
                  </td>
                </tr>
              ) : assetList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No active assets found
                  </td>
                </tr>
              ) : (
                assetList.map((b) => (
                  <tr key={b.asset} className="hover:bg-border/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {b.asset}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-200">
                      {b.available.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">
                      {b.locked.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-white">
                      {(b.available + b.locked).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. TRANSACTION HISTORY LEDGER */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-[#0f172a]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="font-semibold text-white">Transaction History</h2>
            <p className="text-xs text-gray-400">Auditable record of deposits, withdrawals, and trade escrows</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-background border border-border rounded-lg p-0.5 text-xs">
              {['ALL', 'DEPOSIT', 'WITHDRAWAL'].map((f) => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
                    txFilter === f ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f.toLowerCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => loadTransactions(txFilter)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-border/50 transition-colors"
              title="Refresh Transactions"
            >
              <RefreshCw size={15} className={txLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a]/60 text-gray-400 border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5 font-medium">Date</th>
                <th className="px-6 py-3.5 font-medium">Type</th>
                <th className="px-6 py-3.5 font-medium text-right">Amount</th>
                <th className="px-6 py-3.5 font-medium text-center">Status</th>
                <th className="px-6 py-3.5 font-medium">Reference ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {txLoading && transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-border/20 transition-colors">
                    <td className="px-6 py-3.5 text-gray-400 text-xs">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-white flex items-center gap-1.5">
                      {tx.type === 'DEPOSIT' ? (
                        <ArrowDownToLine size={14} className="text-emerald-400" />
                      ) : (
                        <ArrowUpFromLine size={14} className="text-amber-400" />
                      )}
                      <span>{tx.type}</span>
                    </td>
                    <td
                      className={`px-6 py-3.5 text-right font-bold ${
                        tx.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-gray-200'
                      }`}
                    >
                      {tx.type === 'DEPOSIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          tx.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tx.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tx.status === 'COMPLETED' && <CheckCircle2 size={11} />}
                        {tx.status === 'PENDING' && <Clock size={11} />}
                        {tx.status === 'FAILED' && <AlertCircle size={11} />}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 font-mono text-xs">
                      {tx.gateway_payment_id || tx.gateway_order_id || tx.payout_id || tx.id.slice(0, 8)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: ADD MONEY VIA RAZORPAY                          */}
      {/* ========================================================= */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-border bg-[#0f172a]/50">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <IndianRupee size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-white text-base">Add Cash to Wallet</h3>
                  <p className="text-xs text-gray-400">Instant deposit via Razorpay UPI & Cards</p>
                </div>
              </div>
              <button
                onClick={() => setIsDepositOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="p-6 space-y-5">
              {depositError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{depositError}</span>
                </div>
              )}
              {depositSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{depositSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Deposit Amount (INR)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</div>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    disabled={isDepositing}
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="5000"
                  />
                </div>
              </div>

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-2">
                {[1000, 2500, 5000, 10000, 25000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt.toString())}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-border/60 text-gray-300 font-medium transition-colors"
                  >
                    +₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="bg-background/80 border border-border/60 rounded-xl p-3 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Supported Methods:</span>
                  <span className="text-gray-200">GPay, PhonePe, Paytm, Cards, NetBanking</span>
                </div>
                <div className="flex justify-between">
                  <span>Gateway Fee:</span>
                  <span className="text-emerald-400 font-medium">₹0 (Free)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isDepositing}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
              >
                {isDepositing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Connecting Razorpay...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownToLine size={18} />
                    <span>Proceed to Pay with Razorpay</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: WITHDRAW CASH VIA RAZORPAYX                      */}
      {/* ========================================================= */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-border bg-[#0f172a]/50">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <ArrowUpFromLine size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-white text-base">Withdraw Cash</h3>
                  <p className="text-xs text-gray-400">Direct payout via RazorpayX (IMPS/UPI)</p>
                </div>
              </div>
              <button
                onClick={() => setIsWithdrawOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-4">
              {withdrawError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{withdrawError}</span>
                </div>
              )}
              {withdrawSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{withdrawSuccess}</span>
                </div>
              )}

              {/* Available Cash Reminder */}
              <div className="bg-background/80 border border-border/60 rounded-xl p-3 flex justify-between items-center text-sm">
                <span className="text-gray-400">Available to Withdraw:</span>
                <span className="font-bold text-emerald-400 text-base">
                  ₹{inrWallet.available.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Amount (INR)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</div>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    disabled={isWithdrawing}
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(inrWallet.available.toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:underline"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Payout Method Toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Transfer Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawType('upi')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      withdrawType === 'upi'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-background border-border text-gray-400 hover:text-white'
                    }`}
                  >
                    <Smartphone size={15} />
                    Instant UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawType('bank')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      withdrawType === 'bank'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-background border-border text-gray-400 hover:text-white'
                    }`}
                  >
                    <Building2 size={15} />
                    Bank Account (IMPS)
                  </button>
                </div>
              </div>

              {withdrawType === 'upi' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    UPI ID (VPA)
                  </label>
                  <input
                    type="text"
                    value={vpa}
                    onChange={(e) => setVpa(e.target.value)}
                    disabled={isWithdrawing}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="username@okhdfcbank"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      disabled={isWithdrawing}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="Devon Miller"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      disabled={isWithdrawing}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="123456789012"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      disabled={isWithdrawing}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white text-sm uppercase focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="HDFC0001234"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isWithdrawing}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 text-sm"
              >
                {isWithdrawing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processing Payout...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine size={16} />
                    <span>Confirm & Withdraw</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: INSTANT CONVERT (INR <-> USDT)                   */}
      {/* ========================================================= */}
      {isConvertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <ArrowLeftRight size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-white text-base">Convert Currency</h3>
                  <p className="text-xs text-gray-400">Zero fee • Instant 1:1 settlement</p>
                </div>
              </div>
              <button
                onClick={() => setIsConvertOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-border/40 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {convertError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{convertError}</span>
              </div>
            )}

            {convertSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{convertSuccess}</span>
              </div>
            )}

            <form onSubmit={handleConvertSubmit} className="space-y-4">
              {/* Swap Direction Toggle */}
              <div className="flex items-center justify-between bg-[#0f172a]/60 border border-border/60 rounded-xl p-3">
                <div className="flex-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">From</span>
                  <span className="text-base font-extrabold text-white">{convertFrom}</span>
                  <span className="text-xs text-gray-400 block">Avail: {fromWallet.available}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConvertFrom(convertTo);
                    setConvertAmount('');
                    setConvertError('');
                  }}
                  className="p-2.5 rounded-full bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 transition-all active:scale-95"
                  title="Swap direction"
                >
                  <ArrowLeftRight size={16} />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">To</span>
                  <span className="text-base font-extrabold text-emerald-400">{convertTo}</span>
                  <span className="text-xs text-gray-400 block">Avail: {toWallet.available}</span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Amount to Convert
                  </label>
                  <span className="text-xs text-gray-400">
                    Available: <span className="text-white font-medium">{fromWallet.available} {convertFrom}</span>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    disabled={isConverting}
                    className="w-full bg-background border border-border rounded-xl pl-4 pr-16 py-3 text-white text-base focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="e.g. 5000"
                  />
                  <button
                    type="button"
                    onClick={() => setConvertAmount(Math.floor(fromWallet.available).toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Summary / Preview */}
              {parseFloat(convertAmount) > 0 && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-gray-400">
                    <span>Conversion Rate</span>
                    <span className="text-white font-medium">1 {convertFrom} = 1 {convertTo}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Fee</span>
                    <span className="text-emerald-400 font-medium">₹0.00 (Zero Fee)</span>
                  </div>
                  <div className="pt-1.5 border-t border-indigo-500/20 flex justify-between font-semibold">
                    <span className="text-gray-300">You Receive</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {Math.floor(parseFloat(convertAmount))} {convertTo}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isConverting || !convertAmount || parseFloat(convertAmount) <= 0}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 text-sm active:scale-95"
              >
                {isConverting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Converting Funds...</span>
                  </>
                ) : (
                  <>
                    <ArrowLeftRight size={16} />
                    <span>Convert {convertFrom} to {convertTo}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
