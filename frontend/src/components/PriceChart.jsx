import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createChart, CandlestickSeries, AreaSeries, HistogramSeries, ColorType } from 'lightweight-charts';
import { marketApi } from '../api/marketApi';
import { marketWs } from '../services/marketWs';
import { BarChart2, TrendingUp, Activity, RefreshCw, PenTool, Trash2 } from 'lucide-react';

const INTERVALS = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1D', value: '1d' },
];

const getIntervalSeconds = (intVal) => {
  switch (intVal) {
    case '1m': return 60;
    case '5m': return 300;
    case '15m': return 900;
    case '1h': return 3600;
    case '4h': return 14400;
    case '1d': return 86400;
    default: return 900;
  }
};

// Dynamic timeframe-aware candle generator
const generateTimeframeCandles = (symbol, interval, currentPrice) => {
  if (!currentPrice || currentPrice <= 0) return { candles: [], volumes: [] };

  const stepSec = getIntervalSeconds(interval);
  const nowSec = Math.floor(Date.now() / 1000);
  const nowBucket = Math.floor(nowSec / stepSec) * stepSec;

  // Interval-specific volatility and candle count
  const config = {
    '1m':  { bars: 60, vol: 0.0025, noiseFreq: 0.9, trendFreq: 0.18 },
    '5m':  { bars: 60, vol: 0.0065, noiseFreq: 0.7, trendFreq: 0.14 },
    '15m': { bars: 60, vol: 0.0130, noiseFreq: 0.6, trendFreq: 0.11 },
    '1h':  { bars: 50, vol: 0.0260, noiseFreq: 0.5, trendFreq: 0.08 },
    '4h':  { bars: 40, vol: 0.0480, noiseFreq: 0.4, trendFreq: 0.06 },
    '1d':  { bars: 30, vol: 0.0850, noiseFreq: 0.3, trendFreq: 0.04 },
  }[interval] || { bars: 50, vol: 0.015, noiseFreq: 0.6, trendFreq: 0.1 };

  // Deterministic seed based on symbol + interval characters
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed = (seed * 31 + symbol.charCodeAt(i)) % 10007;
  for (let i = 0; i < interval.length; i++) seed = (seed * 17 + interval.charCodeAt(i)) % 10007;

  const count = config.bars;
  const vol = config.vol * currentPrice;

  // Generate smooth price path that terminates exactly at currentPrice at index count - 1
  const rawPrices = [];
  for (let k = 0; k < count; k++) {
    const cycle1 = Math.sin((k + seed * 0.1) * config.trendFreq);
    const cycle2 = Math.cos((k + seed * 0.2) * config.noiseFreq) * 0.5;
    const cycle3 = Math.sin((k + seed * 0.3) * (config.trendFreq * 2.3)) * 0.35;
    rawPrices.push(cycle1 + cycle2 + cycle3);
  }

  const endRaw = rawPrices[count - 1];
  const candles = [];
  const volumes = [];

  let prevClose = currentPrice;
  for (let k = 0; k < count; k++) {
    const time = nowBucket - (count - 1 - k) * stepSec;
    // Align so the final candle close matches currentPrice
    const diffFromEnd = (rawPrices[k] - endRaw) * vol;
    const targetClose = k === count - 1
      ? Math.round(currentPrice * 100) / 100
      : Math.max(0.01, Math.round((currentPrice + diffFromEnd) * 100) / 100);

    const open = k === 0
      ? Math.max(0.01, Math.round((targetClose - vol * 0.25) * 100) / 100)
      : prevClose;
    const close = targetClose;
    prevClose = close;

    const barRange = Math.abs(close - open);
    const wickSpread = Math.max(vol * 0.3, barRange * 0.4);
    const high = Math.round((Math.max(open, close) + wickSpread) * 100) / 100;
    const low = Math.max(0.01, Math.round((Math.min(open, close) - wickSpread) * 100) / 100);

    const baseVol = interval === '1d' ? 600 : (interval === '1h' ? 150 : (interval === '5m' ? 40 : 15));
    const volVal = Math.round(baseVol * (1 + Math.abs(Math.sin(k * 0.7 + seed)) * 1.5));

    candles.push({
      time,
      open,
      high,
      low,
      close,
      value: close, // For Area/Line series
    });

    volumes.push({
      time,
      value: volVal,
      color: close >= open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
    });
  }

  return { candles, volumes };
};

export default function PriceChart({ symbol = 'BTCUSDT', currentPrice: externalPrice = 0 }) {
  const cleanSymbol = useMemo(() => symbol.replace('/', '').replace('_', '').toUpperCase(), [symbol]);

  const [chartMode, setChartMode] = useState('candles'); // 'candles' | 'area'
  const [interval, setInterval] = useState('15m');
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [hoverData, setHoverData] = useState(null);
  const [currentCandle, setCurrentCandle] = useState(null);

  // Interactive Trendline Drawing State
  const [isDrawingTrendline, setIsDrawingTrendline] = useState(false);
  const [pendingPoint, setPendingPoint] = useState(null);
  const [cursorPos, setCursorPos] = useState(null);
  const [trendlines, setTrendlines] = useState([]);

  const containerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const mainSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const lastCandleRef = useRef(null);

  // Helper to format UNIX seconds cleanly
  const formatTime = (isoString, fallbackTimeSec) => {
    if (!isoString) return fallbackTimeSec;
    const d = new Date(isoString);
    if (isNaN(d.getTime()) || d.getFullYear() < 2020) return fallbackTimeSec;
    return Math.floor(d.getTime() / 1000);
  };

  // Trendline event handlers
  const handleOverlayClick = (e) => {
    if (!isDrawingTrendline) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    if (!pendingPoint) {
      setPendingPoint({ x, y });
    } else {
      const newLine = {
        id: Date.now(),
        x1: pendingPoint.x,
        y1: pendingPoint.y,
        x2: x,
        y2: y,
      };
      setTrendlines((prev) => [...prev, newLine]);
      setPendingPoint(null);
    }
  };

  const handleOverlayMouseMove = (e) => {
    if (!isDrawingTrendline) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    });
  };

  // 1. Initialize Lightweight Chart instance
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up any old chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.15)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.15)' },
      },
      crosshair: {
        vertLine: {
          color: '#64748b',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#64748b',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.3)',
        scaleMargins: {
          top: 0.08,
          bottom: 0.22,
        },
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.3)',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
      },
    });

    chartInstanceRef.current = chart;

    // Add main price series (Candles or Area)
    if (chartMode === 'candles') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
      mainSeriesRef.current = candleSeries;
    } else {
      const areaSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(56, 189, 248, 0.4)',
        bottomColor: 'rgba(56, 189, 248, 0.0)',
        lineColor: '#38bdf8',
        lineWidth: 2,
      });
      mainSeriesRef.current = areaSeries;
    }

    // Add Volume Histogram Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay over chart
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Handle crosshair hover legend
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHoverData(null);
        return;
      }
      const priceData = param.seriesData.get(mainSeriesRef.current);
      const volData = param.seriesData.get(volumeSeriesRef.current);
      if (priceData) {
        setHoverData({
          open: priceData.open ?? priceData.value,
          high: priceData.high ?? priceData.value,
          low: priceData.low ?? priceData.value,
          close: priceData.close ?? priceData.value,
          volume: volData?.value ?? null,
        });
      }
    });

    // Resize observer for responsive layout
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0 && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
        mainSeriesRef.current = null;
        volumeSeriesRef.current = null;
      }
    };
  }, [chartMode]);

  // 2. Fetch Velocity Backend Candles and set data
  const loadCandleData = useCallback(async () => {
    setLoading(true);

    try {
      const stepSec = getIntervalSeconds(interval);

      let candleList = [];
      try {
        const res = await marketApi.getCandles(cleanSymbol, interval, 150);
        const raw = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        if (raw && raw.length > 0) {
          candleList = raw;
        }
      } catch (err) {
        console.warn('[PriceChart] getCandles error:', err);
      }

      // Determine active price (prefer externalPrice, fallback to ticker API)
      let currentPrice = Number(externalPrice) > 0 ? Number(externalPrice) : 0;
      if (currentPrice <= 0) {
        try {
          const tickerRes = await marketApi.getTicker(cleanSymbol);
          const tData = tickerRes?.data || tickerRes;
          if (tData?.last_price) {
            currentPrice = Number(tData.last_price);
          }
        } catch {}
      }

      // Apply dynamic timescale options based on interval
      if (chartInstanceRef.current) {
        chartInstanceRef.current.timeScale().applyOptions({
          timeVisible: interval !== '1d',
          secondsVisible: interval === '1m',
        });
      }

      let formattedCandles = [];
      let formattedVolumes = [];
      const nowSec = Math.floor(Date.now() / 1000);
      const nowBucket = Math.floor(nowSec / stepSec) * stepSec;

      if (candleList.length > 0) {
        const sorted = [...candleList].sort((a, b) => new Date(a.open_time).getTime() - new Date(b.open_time).getTime());

        let lastTimeSec = 0;
        for (let i = 0; i < sorted.length; i++) {
          const c = sorted[i];
          const d = new Date(c.open_time);
          let parsedSec = !isNaN(d.getTime()) && d.getFullYear() > 2020
            ? Math.floor(d.getTime() / 1000)
            : (nowBucket - (sorted.length - i) * stepSec);

          let timeSec = Math.floor(parsedSec / stepSec) * stepSec;
          if (timeSec <= lastTimeSec) {
            timeSec = lastTimeSec + stepSec;
          }
          lastTimeSec = timeSec;

          const open = Number(c.open || c.close || currentPrice);
          const high = Number(c.high || Math.max(open, Number(c.close || open)));
          const low = Number(c.low || Math.min(open, Number(c.close || open)));
          const close = Number(c.close || open);
          const vol = Number(c.volume || 0);

          formattedCandles.push({
            time: timeSec,
            open,
            high,
            low,
            close,
            value: close, // For Area mode
          });

          formattedVolumes.push({
            time: timeSec,
            value: vol,
            color: close >= open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          });
        }
      } else if (currentPrice > 0) {
        // Generate dynamic timeframe-aware candles spaced strictly according to selected interval
        const generated = generateTimeframeCandles(cleanSymbol, interval, currentPrice);
        formattedCandles = generated.candles;
        formattedVolumes = generated.volumes;
      }

      if (mainSeriesRef.current && chartInstanceRef.current) {
        mainSeriesRef.current.setData(formattedCandles);
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(formattedVolumes);
        }
        chartInstanceRef.current.timeScale().fitContent();

        if (formattedCandles.length > 0) {
          const latest = formattedCandles[formattedCandles.length - 1];
          lastCandleRef.current = latest;
          setCurrentCandle(latest);
        }
      }
    } catch (err) {
      console.error('[PriceChart] Failed to load native candles:', err);
    } finally {
      setLoading(false);
    }
  }, [cleanSymbol, interval, chartMode, externalPrice]);

  // Run on mount or symbol/interval/mode change
  useEffect(() => {
    loadCandleData();
  }, [loadCandleData]);

  // React immediately to live price changes (e.g. order executed, buy product, ticker tick)
  useEffect(() => {
    if (!externalPrice || Number(externalPrice) <= 0 || !mainSeriesRef.current || !lastCandleRef.current) return;
    const newPrice = Number(externalPrice);
    if (lastCandleRef.current.close === newPrice && lastCandleRef.current.value === newPrice) return;

    const updated = {
      ...lastCandleRef.current,
      close: newPrice,
      value: newPrice,
      high: Math.max(Number(lastCandleRef.current.high || newPrice), newPrice),
      low: Math.min(Number(lastCandleRef.current.low || newPrice), newPrice),
    };
    lastCandleRef.current = updated;
    mainSeriesRef.current.update(updated);
    setCurrentCandle(updated);
  }, [externalPrice]);

  // 3. Real-Time WebSocket Subscription to Velocity Engine (/ws)
  useEffect(() => {
    if (chartMode === 'tradingview') return;

    setWsConnected(true);
    const unsubscribe = marketWs.subscribe(cleanSymbol, (msg) => {
      // A. Real-Time Kline/Candlestick update
      if (msg.type === 'kline' && msg.data) {
        const k = msg.data;
        const timeSec = formatTime(k.open_time, Math.floor(Date.now() / 1000));
        const open = Number(k.open);
        const high = Number(k.high);
        const low = Number(k.low);
        const close = Number(k.close);
        const volume = Number(k.volume || 0);

        const candleUpdate = {
          time: timeSec,
          open,
          high,
          low,
          close,
          value: close,
        };

        if (mainSeriesRef.current) {
          mainSeriesRef.current.update(candleUpdate);
        }
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.update({
            time: timeSec,
            value: volume,
            color: close >= open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          });
        }

        lastCandleRef.current = candleUpdate;
        setCurrentCandle(candleUpdate);
      }

      // B. Real-Time Trade update
      if (msg.type === 'trade' && msg.data) {
        const tradePrice = Number(msg.data.price);
        const tradeQty = Number(msg.data.quantity);
        const nowSec = Math.floor(Date.now() / 1000);

        if (lastCandleRef.current) {
          const current = { ...lastCandleRef.current };
          current.close = tradePrice;
          current.high = Math.max(current.high, tradePrice);
          current.low = Math.min(current.low, tradePrice);
          current.value = tradePrice;

          if (mainSeriesRef.current) {
            mainSeriesRef.current.update(current);
          }
          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.update({
              time: current.time,
              value: (current.volume || 0) + tradeQty,
              color: current.close >= current.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
            });
          }
          lastCandleRef.current = current;
          setCurrentCandle(current);
        } else {
          const newPoint = {
            time: nowSec,
            open: tradePrice,
            high: tradePrice,
            low: tradePrice,
            close: tradePrice,
            value: tradePrice,
          };
          if (mainSeriesRef.current) {
            mainSeriesRef.current.update(newPoint);
          }
          lastCandleRef.current = newPoint;
          setCurrentCandle(newPoint);
        }
      }
    });

    return () => {
      setWsConnected(false);
      unsubscribe();
    };
  }, [cleanSymbol, chartMode]);

  const activeDisplay = hoverData || currentCandle;

  return (
    <div className="h-full w-full bg-surface border border-border rounded-lg overflow-hidden flex flex-col relative">
      {/* Top Chart Header / Controls */}
      <div className="p-2 px-4 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-[#0f172a]/80">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Chart Mode Toggle */}
          <div className="flex items-center gap-1 bg-background/90 p-0.5 rounded-lg border border-border/60">
            <button
              onClick={() => setChartMode('candles')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                chartMode === 'candles'
                  ? 'bg-primary text-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart2 size={13} />
              Candles
            </button>
            <button
              onClick={() => setChartMode('area')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                chartMode === 'area'
                  ? 'bg-primary text-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingUp size={13} />
              Line / Area
            </button>
          </div>

          {/* Interactive Trade Line / Trendline Tool */}
          <div className="flex items-center gap-1 bg-background/90 p-0.5 rounded-lg border border-border/60">
            <button
              onClick={() => {
                setIsDrawingTrendline(!isDrawingTrendline);
                setPendingPoint(null);
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isDrawingTrendline
                  ? 'bg-sky-500 text-white shadow-sm ring-1 ring-sky-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Click to draw interactive trendlines on the chart"
            >
              <PenTool size={13} />
              <span>Trendline {isDrawingTrendline ? '(Active)' : ''}</span>
            </button>

            {trendlines.length > 0 && (
              <button
                onClick={() => {
                  setTrendlines([]);
                  setPendingPoint(null);
                }}
                className="px-2 py-1 rounded text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center gap-1"
                title="Clear all trendlines"
              >
                <Trash2 size={12} />
                <span>Clear ({trendlines.length})</span>
              </button>
            )}
          </div>

          {/* Timeframe selector (for Velocity Native Chart) */}
          <div className="flex items-center gap-0.5 bg-background/90 p-0.5 rounded-lg border border-border/60 text-xs">
            {INTERVALS.map((int) => (
              <button
                key={int.value}
                onClick={() => {
                  setInterval(int.value);
                  setHoverData(null);
                }}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  interval === int.value
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {int.label}
              </button>
            ))}
          </div>

          {/* Live Engine Status Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">Velocity WebSocket</span>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadCandleData}
          title="Reload Chart Data"
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-border/40 transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-primary' : ''} />
        </button>
      </div>

      {/* OHLCV Legend Bar (shows current/hovered candle values) */}
      <div className="px-4 py-1.5 bg-[#0f172a] border-b border-border/40 flex items-center gap-4 text-[11px] font-mono text-gray-400 overflow-x-auto select-none">
        <span className="font-bold text-white tracking-wide">{cleanSymbol}</span>
        {activeDisplay ? (
          <>
            <div>
              O: <span className="text-white font-medium">${Number(activeDisplay.open || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              H: <span className="text-emerald-400 font-medium">${Number(activeDisplay.high || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              L: <span className="text-rose-400 font-medium">${Number(activeDisplay.low || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              C: <span className={`font-semibold ${Number(activeDisplay.close) >= Number(activeDisplay.open) ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${Number(activeDisplay.close || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            {activeDisplay.volume !== null && activeDisplay.volume !== undefined && (
              <div>
                Vol: <span className="text-sky-400 font-medium">{Number(activeDisplay.volume).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </>
        ) : (
          <span className="text-gray-500 italic">Waiting for market data...</span>
        )}
      </div>

      {/* Chart Canvas Area */}
      <div className="flex-1 w-full h-full min-h-[380px] relative bg-[#0f172a] overflow-hidden select-none">
        {loading && !lastCandleRef.current && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f172a]/80 text-gray-400 text-xs gap-2">
            <RefreshCw size={15} className="animate-spin text-primary" />
            Loading Velocity Engine Data...
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />

        {/* Interactive Trendline Drawing Overlay */}
        <svg
          onClick={handleOverlayClick}
          onMouseMove={handleOverlayMouseMove}
          className={`absolute inset-0 w-full h-full z-20 ${
            isDrawingTrendline ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          <defs>
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.9" />
            </filter>
          </defs>

          {/* Render Locked Trendlines */}
          {trendlines.map((line) => (
            <g key={line.id} className="group">
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeLinecap="round"
                filter="url(#neon-glow)"
              />
              <circle cx={line.x1} cy={line.y1} r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx={line.x2} cy={line.y2} r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
            </g>
          ))}

          {/* Render In-Progress Trendline Preview */}
          {pendingPoint && cursorPos && (
            <g>
              <line
                x1={pendingPoint.x}
                y1={pendingPoint.y}
                x2={cursorPos.x}
                y2={cursorPos.y}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="4 4"
                filter="url(#neon-glow)"
              />
              <circle cx={pendingPoint.x} cy={pendingPoint.y} r="5" fill="#38bdf8" stroke="#fff" strokeWidth="2" />
              <circle cx={cursorPos.x} cy={cursorPos.y} r="4" fill="#a855f7" stroke="#fff" strokeWidth="1" />
            </g>
          )}
        </svg>

        {/* Floating guidance banner when in drawing mode */}
        {isDrawingTrendline && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1 bg-sky-950/90 text-sky-200 border border-sky-500/50 rounded-full text-xs font-medium shadow-xl backdrop-blur-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
            <span>
              {pendingPoint ? 'Click second point to finish trade line' : 'Click on chart to set start point'}
            </span>
            <button
              onClick={() => {
                setIsDrawingTrendline(false);
                setPendingPoint(null);
              }}
              className="text-sky-300 hover:text-white ml-2 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
