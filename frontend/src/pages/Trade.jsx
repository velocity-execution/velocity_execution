import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSymbols } from '../store/marketSlice';
import { marketApi } from '../api/marketApi';
import { marketWs } from '../services/marketWs';
import PriceChart from '../components/PriceChart';
import OrderBook from '../components/OrderBook';
import OrderForm from '../components/OrderForm';
import RecentTrades from '../components/RecentTrades';
import { TrendingUp, TrendingDown, ChevronDown, Activity, Layers } from 'lucide-react';

const DEFAULT_SYMBOL = 'CTG_USDT';

export default function Trade() {
  const { symbol = DEFAULT_SYMBOL } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { symbols: reduxSymbols } = useSelector((state) => state.market);
  const [symbolsList, setSymbolsList] = useState([]);
  const [ticker, setTicker] = useState(null);
  const [stats, setStats] = useState(null);
  const [showRecentTrades, setShowRecentTrades] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch available market symbols from database
  useEffect(() => {
    dispatch(fetchSymbols());
    marketApi.getSymbols().then((res) => {
      const data = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      if (data && data.length > 0) {
        setSymbolsList(data);
      }
    }).catch(() => {});
  }, [dispatch]);

  // Track selected/clicked symbols history to hoist active item to 1st position (e.g. A, B, C, D -> click B -> B, A, C, D -> click D -> D, B, A, C)
  const [selectedHistory, setSelectedHistory] = useState(() => {
    try {
      const stored = sessionStorage.getItem('velocity_trade_mru');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Base list ordered by:
  // 1. Most stocks first (stock > 0, stock DESC)
  // 2. Recent sell orders / trades (latest_trade_time DESC)
  // 3. Other platform symbols for analysis
  const baseAvailablePairs = useMemo(() => {
    let sourceList = [];
    if (symbolsList.length > 0) sourceList = symbolsList;
    else if (reduxSymbols && reduxSymbols.length > 0) sourceList = reduxSymbols;

    const seen = new Set();
    const unique = [];
    for (const item of sourceList) {
      const sym = (item?.symbol || item || '').toUpperCase();
      if (sym && !seen.has(sym)) {
        seen.add(sym);
        unique.push(typeof item === 'string' ? { symbol: sym, display_name: `${sym}/USDT` } : item);
      }
    }

    return unique.sort((a, b) => {
      const stockA = Number(a.stock || 0);
      const stockB = Number(b.stock || 0);
      const hasStockA = stockA > 0 ? 1 : 0;
      const hasStockB = stockB > 0 ? 1 : 0;
      if (hasStockB !== hasStockA) {
        return hasStockB - hasStockA; // Items with stock first
      }
      if (stockB !== stockA) {
        return stockB - stockA; // Most stock first
      }
      const tradeA = Number(a.latest_trade_time || 0);
      const tradeB = Number(b.latest_trade_time || 0);
      const hasTradeA = tradeA > 0 ? 1 : 0;
      const hasTradeB = tradeB > 0 ? 1 : 0;
      if (hasTradeB !== hasTradeA) {
        return hasTradeB - hasTradeA; // Recent sell orders / trades next
      }
      if (tradeB !== tradeA) {
        return tradeB - tradeA;
      }
      return 0; // Preserve catalog order (do not force alphabetical)
    });
  }, [symbolsList, reduxSymbols]);

  // Match requested symbol to valid symbol in baseAvailablePairs
  const activePair = useMemo(() => {
    const req = (symbol || DEFAULT_SYMBOL).replace('/', '').trim().toUpperCase();
    return baseAvailablePairs.find((p) => {
      const s = (p.symbol || p || '').toUpperCase();
      return s === req || s.replace(/_/g, '') === req.replace(/_/g, '');
    }) || baseAvailablePairs[0];
  }, [symbol, baseAvailablePairs]);

  const cleanSymbol = activePair?.symbol || (symbol || DEFAULT_SYMBOL).replace('/', '').trim().toUpperCase();

  // Track clicked/selected symbol history: currently active symbol is placed at index 0
  useEffect(() => {
    if (!cleanSymbol) return;
    setSelectedHistory((prev) => {
      const filtered = prev.filter((s) => s.toUpperCase() !== cleanSymbol.toUpperCase());
      const updated = [cleanSymbol.toUpperCase(), ...filtered];
      try {
        sessionStorage.setItem('velocity_trade_mru', JSON.stringify(updated.slice(0, 30)));
      } catch {}
      return updated;
    });
  }, [cleanSymbol]);

  // Handler for user clicking/selecting any symbol in dropdown:
  // Immediately hoists clicked item to index 0, followed by previously clicked items
  const handleSymbolChange = (newSym) => {
    if (!newSym) return;
    const sym = newSym.toUpperCase();
    setSelectedHistory((prev) => {
      const filtered = prev.filter((s) => s.toUpperCase() !== sym);
      const updated = [sym, ...filtered];
      try {
        sessionStorage.setItem('velocity_trade_mru', JSON.stringify(updated.slice(0, 30)));
      } catch {}
      return updated;
    });
    navigate(`/trade/${newSym}`);
  };

  // Dynamic user-clicked order:
  // When user clicks B -> [B, A, C, D]
  // Then user clicks D -> [D, B, A, C]
  const availablePairs = useMemo(() => {
    if (baseAvailablePairs.length === 0) return [];

    const pairMap = new Map();
    for (const p of baseAvailablePairs) {
      const sym = (p.symbol || p || '').toUpperCase();
      pairMap.set(sym, p);
    }

    const hoisted = [];
    const used = new Set();

    // Priority 0: Ensure active cleanSymbol is at index 0, followed by prior selection history
    const effectiveHistory = cleanSymbol
      ? [cleanSymbol, ...selectedHistory.filter((s) => s.toUpperCase() !== cleanSymbol.toUpperCase())]
      : selectedHistory;

    // Hoisted symbols in order of selection recency
    for (const sym of effectiveHistory) {
      if (pairMap.has(sym) && !used.has(sym)) {
        hoisted.push(pairMap.get(sym));
        used.add(sym);
      }
    }

    // Followed by the rest of the available products in priority order
    for (const p of baseAvailablePairs) {
      const sym = (p.symbol || p || '').toUpperCase();
      if (!used.has(sym)) {
        hoisted.push(p);
        used.add(sym);
      }
    }

    return hoisted;
  }, [baseAvailablePairs, selectedHistory, cleanSymbol]);

  // If user hits an old crypto symbol or invalid symbol, redirect to first valid database product
  useEffect(() => {
    if (['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'].includes(cleanSymbol.replace(/_/g, ''))) {
      const target = availablePairs[0]?.symbol || DEFAULT_SYMBOL;
      navigate(`/trade/${target}`, { replace: true });
    }
  }, [cleanSymbol, availablePairs, navigate]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowRecentTrades(false);
      }
    }
    if (showRecentTrades) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRecentTrades]);

  useEffect(() => {
    let isMounted = true;

    const fetchMarketData = async () => {
      try {
        const [tickerData, statsData] = await Promise.all([
          marketApi.getTicker(cleanSymbol).catch(() => null),
          marketApi.getStats(cleanSymbol).catch(() => null),
        ]);
        if (isMounted) {
          if (tickerData) setTicker(tickerData?.data || tickerData);
          if (statsData) setStats(statsData?.data || statsData);
        }
      } catch (err) {
        console.warn('[Trade] Error fetching market data', err);
      }
    };

    fetchMarketData();

    // Subscribe to real-time Velocity WebSocket updates
    const unsubscribe = marketWs.subscribe(cleanSymbol, (msg) => {
      if (msg.type === 'ticker' && msg.data) {
        setTicker((prev) => ({
          ...prev,
          last_price: msg.data.last_price ?? prev?.last_price,
          best_bid: msg.data.best_bid ?? prev?.best_bid,
          best_ask: msg.data.best_ask ?? prev?.best_ask,
        }));
      } else if (msg.type === 'trade' && msg.data) {
        setTicker((prev) => ({
          ...prev,
          last_price: Number(msg.data.price),
        }));
      }
    });

    const interval = setInterval(fetchMarketData, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [cleanSymbol]);

  // Match active symbol object for catalog fallback price
  const activeSymbolObj = availablePairs.find((p) => (p.symbol || '').toUpperCase() === cleanSymbol);
  const catalogPrice = Number(activeSymbolObj?.price || 0);

  // Determine current active price and stats (prefer local trade, fallback to database catalog price)
  const localPrice = Number(ticker?.last_price || ticker?.price || stats?.last_price || stats?.price || 0);
  const currentPrice = localPrice > 0 ? localPrice : catalogPrice;

  const localChange = Number(stats?.change24h || 0);
  const change24h = localChange;

  const localHigh = Number(stats?.high_price || stats?.high24h || 0);
  const high24h = localHigh > 0 ? localHigh : (currentPrice > 0 ? currentPrice : null);

  const localLow = Number(stats?.low_price || stats?.low24h || 0);
  const low24h = localLow > 0 ? localLow : (currentPrice > 0 ? currentPrice : null);

  const localVol = Number(stats?.quote_volume || stats?.volume24h || 0);
  const volume24h = localVol;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] overflow-hidden">
      {/* Top Ticker Info Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border shrink-0 gap-4">
        <div className="flex items-center gap-6 overflow-x-auto">
          {/* Pair selector dropdown */}
          <div className="flex items-center gap-3">
            <select
              value={cleanSymbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              className="bg-background border border-border text-white text-base font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary cursor-pointer max-w-[340px]"
            >
              {availablePairs.map((p) => {
                const sym = p.symbol || p;
                const base = p.base_asset || sym.replace('_USDT', '').replace('USDT', '');
                const quote = p.quote_asset || 'USDT';
                const rawTitle = p.display_name ? p.display_name.split('/')[0]?.trim() : '';
                const nameLabel = rawTitle && rawTitle !== base ? `(${rawTitle})` : '';
                return (
                  <option key={sym} value={sym}>
                    {base}/{quote} {nameLabel}
                  </option>
                );
              })}
            </select>

            <span className={`text-xl font-extrabold font-mono flex items-center gap-1.5 ${change24h >= 0 ? 'text-success' : 'text-danger'}`}>
              ${currentPrice > 0 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              {change24h >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </span>
          </div>

          <div className="h-6 w-px bg-border hidden md:block"></div>

          {/* 24h Stats */}
          <div className="flex items-center gap-6 text-sm whitespace-nowrap">
            <div>
              <div className="text-gray-400 text-[11px]">24h Change</div>
              <div className={`font-mono font-semibold text-xs ${change24h >= 0 ? 'text-success' : 'text-danger'}`}>
                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-gray-400 text-[11px]">24h High</div>
              <div className="font-mono font-medium text-xs text-white">
                {high24h ? `$${high24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '---'}
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-gray-400 text-[11px]">24h Low</div>
              <div className="font-mono font-medium text-xs text-white">
                {low24h ? `$${low24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '---'}
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-gray-400 text-[11px]">24h Volume</div>
              <div className="font-mono font-medium text-xs text-white">
                {volume24h ? volume24h.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Action: Recent Trades Dropdown Button */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            id="recent-trades-dropdown-btn"
            onClick={() => setShowRecentTrades((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border shadow-sm ${
              showRecentTrades
                ? 'bg-primary text-black border-primary shadow-primary/20'
                : 'bg-background hover:bg-border/60 text-white border-border hover:border-gray-500'
            }`}
          >
            <Activity size={14} className={showRecentTrades ? 'text-black' : 'text-emerald-400 animate-pulse'} />
            <span>Recent Trades</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${showRecentTrades ? 'rotate-180' : ''}`} />
          </button>

          {/* Floating Dropdown Modal / Popover */}
          {showRecentTrades && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 h-[500px] z-50 rounded-xl overflow-hidden shadow-2xl border border-border bg-[#0f172a] animate-in fade-in slide-in-from-top-2 duration-150">
              <RecentTrades symbol={cleanSymbol} onClose={() => setShowRecentTrades(false)} />
            </div>
          )}
        </div>
      </div>

      {/* Main Trading Area: Left = Full Live Chart | Right = Order Book & Order Form */}
      <div className="flex-1 overflow-hidden p-2 flex flex-col lg:flex-row gap-2 relative">
        {/* Left / Main Section: Live Price Chart */}
        <div className="flex-1 min-w-0 h-full min-h-[450px]">
          <PriceChart symbol={cleanSymbol} currentPrice={currentPrice} />
        </div>

        {/* Right Side: Order Book & Buy/Sell Order Form */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col gap-2 h-full overflow-hidden">
          {/* Top Half: Order Book */}
          <div className="flex-1 min-h-[300px] overflow-hidden">
            <OrderBook 
              symbol={cleanSymbol} 
              currentPrice={currentPrice} 
              onToggleTrades={() => setShowRecentTrades(prev => !prev)}
            />
          </div>

          {/* Bottom Half: Buy & Sell Order Form */}
          <div className="shrink-0">
            <OrderForm symbol={cleanSymbol} currentPrice={currentPrice} />
          </div>
        </div>
      </div>
    </div>
  );
}
