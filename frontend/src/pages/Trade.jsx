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

const DEFAULT_SYMBOL = 'CTGUSDT';

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

  // Combine redux symbols and local symbols list with strict deduplication
  const availablePairs = useMemo(() => {
    let sourceList = [];
    if (symbolsList.length > 0) sourceList = symbolsList;
    else if (reduxSymbols && reduxSymbols.length > 0) sourceList = reduxSymbols;
    else {
      sourceList = [
        { symbol: 'CTG_USDT', display_name: 'catrige / USDT', base_asset: 'CTG', quote_asset: 'USDT', price: 100.25 },
        { symbol: 'VAL-RACK_USDT', display_name: 'Enterprise Edge Validator Rack / USDT', base_asset: 'VAL-RACK', quote_asset: 'USDT', price: 1450.00 },
        { symbol: 'LEDGER-STX_USDT', display_name: 'Ledger Stax Hardware Wallet / USDT', base_asset: 'LEDGER-STX', quote_asset: 'USDT', price: 277.69 },
        { symbol: 'S21-PRO_USDT', display_name: 'Antminer S21 Pro Miner / USDT', base_asset: 'S21-PRO', quote_asset: 'USDT', price: 3800.00 },
        { symbol: 'H100-NODE_USDT', display_name: 'Velocity GPU Cloud Node / USDT', base_asset: 'H100-NODE', quote_asset: 'USDT', price: 2500.00 },
        { symbol: 'RPI5-NODE_USDT', display_name: 'Raspberry Pi 5 Staking Cluster / USDT', base_asset: 'RPI5-NODE', quote_asset: 'USDT', price: 280.00 },
        { symbol: 'RTX-4090_USDT', display_name: 'NVIDIA RTX 4090 Workstation Rig / USDT', base_asset: 'RTX-4090', quote_asset: 'USDT', price: 3200.00 },
        { symbol: 'STARLINK_USDT', display_name: 'Starlink High Performance Kit / USDT', base_asset: 'STARLINK', quote_asset: 'USDT', price: 599.00 },
        { symbol: 'YUBI-5C_USDT', display_name: 'YubiKey 5C NFC Security Key / USDT', base_asset: 'YUBI-5C', quote_asset: 'USDT', price: 55.00 },
        { symbol: 'APPL-VP_USDT', display_name: 'Apple Vision Pro Dev Kit / USDT', base_asset: 'APPL-VP', quote_asset: 'USDT', price: 3499.00 },
      ];
    }

    const seen = new Set();
    const unique = [];
    for (const item of sourceList) {
      const sym = (item?.symbol || item || '').toUpperCase();
      if (sym && !seen.has(sym)) {
        seen.add(sym);
        unique.push(typeof item === 'string' ? { symbol: sym, display_name: `${sym}/USDT` } : item);
      }
    }
    return unique;
  }, [symbolsList, reduxSymbols]);

  // Match requested symbol to valid symbol in availablePairs
  const activePair = useMemo(() => {
    const req = (symbol || DEFAULT_SYMBOL).replace('/', '').trim().toUpperCase();
    return availablePairs.find((p) => {
      const s = (p.symbol || p || '').toUpperCase();
      return s === req || s.replace(/_/g, '') === req.replace(/_/g, '');
    }) || availablePairs[0];
  }, [symbol, availablePairs]);

  const cleanSymbol = activePair?.symbol || (symbol || DEFAULT_SYMBOL).replace('/', '').trim().toUpperCase();

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
              onChange={(e) => navigate(`/trade/${e.target.value}`)}
              className="bg-background border border-border text-white text-base font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary cursor-pointer max-w-[260px]"
            >
              {availablePairs.map((p) => {
                const sym = p.symbol || p;
                const base = p.base_asset || sym.replace('USDT', '');
                const quote = p.quote_asset || 'USDT';
                return (
                  <option key={sym} value={sym}>
                    {base}/{quote} {p.display_name ? `(${p.display_name.split('/')[0]?.trim()})` : ''}
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
