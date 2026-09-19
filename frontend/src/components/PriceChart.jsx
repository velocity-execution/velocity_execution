import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createChart, CandlestickSeries, AreaSeries, HistogramSeries, ColorType, LineStyle } from 'lightweight-charts';
import { marketApi } from '../api/marketApi';
import { marketWs } from '../services/marketWs';
import { BarChart2, TrendingUp, Activity, RefreshCw, PenTool, Trash2, Plus, Minus, Maximize2 } from 'lucide-react';

const INTERVALS = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '1D', value: '1d' },
];

const getIntervalSeconds = (intVal) => {
  switch (intVal) {
    case '1m': return 60;
    case '5m': return 300;
    case '15m': return 900;
    case '30m': return 1800;
    case '1h': return 3600;
    case '4h': return 14400;
    case '1d': return 86400;
    default: return 900;
  }
};

export default function PriceChart({ symbol = 'BTCUSDT', currentPrice: externalPrice = 0 }) {
  const cleanSymbol = useMemo(() => symbol.replace('/', '').trim().toUpperCase(), [symbol]);

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
  const realPriceLineRef = useRef(null);
  // Preserves 100% genuine real trade OHLC values for sheet, tooltips, legend & crosshairs
  const candleMapRef = useRef(new Map());

  // Updates dedicated price line so the price scale badge accurately reads the real execution price
  const updatePriceLine = useCallback((price, isBullishArg) => {
    if (!mainSeriesRef.current || !price || Number(price) <= 0) return;
    if (realPriceLineRef.current) {
      try {
        mainSeriesRef.current.removePriceLine(realPriceLineRef.current);
      } catch { }
      realPriceLineRef.current = null;
    }
    const last = lastCandleRef.current;
    const isBullish = typeof isBullishArg === 'boolean'
      ? isBullishArg
      : (last ? (last.isBullish !== undefined ? last.isBullish : Number(last.close) >= Number(last.open)) : true);
    try {
      realPriceLineRef.current = mainSeriesRef.current.createPriceLine({
        price: Number(price),
        color: isBullish ? '#10b981' : '#ef4444',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: '',
      });
    } catch { }
  }, []);

  // Zoom and Scale Helpers (normal standard bar spacing)
  const handleZoomIn = () => {
    if (!chartInstanceRef.current) return;
    const current = chartInstanceRef.current.timeScale().options().barSpacing || 16;
    chartInstanceRef.current.timeScale().applyOptions({ barSpacing: Math.min(current * 1.3, 60) });
  };

  const handleZoomOut = () => {
    if (!chartInstanceRef.current) return;
    const current = chartInstanceRef.current.timeScale().options().barSpacing || 16;
    chartInstanceRef.current.timeScale().applyOptions({ barSpacing: Math.max(current / 1.3, 5) });
  };

  const handleFitContent = () => {
    if (!chartInstanceRef.current) return;
    chartInstanceRef.current.timeScale().fitContent();
  };

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
      localization: {
        locale: 'en-IN',
        dateFormat: 'dd MMM yyyy',
        timeFormatter: (time) => {
          const timestampSec = typeof time === 'number'
            ? time
            : (time?.year ? Math.floor(new Date(Date.UTC(time.year, time.month - 1, time.day)).getTime() / 1000) : 0);
          if (!timestampSec) return '';
          return new Date(timestampSec * 1000).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }) + ' IST';
        },
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.2)', style: LineStyle.Dotted },
        horzLines: { color: 'rgba(51, 65, 85, 0.2)', style: LineStyle.Dotted },
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
        autoScale: true,
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.3)',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 16,
        minBarSpacing: 5,
        rightOffset: 12,
        fixLeftEdge: false,
        tickMarkFormatter: (time, tickMarkType) => {
          const timestampSec = typeof time === 'number'
            ? time
            : (time?.year ? Math.floor(new Date(Date.UTC(time.year, time.month - 1, time.day)).getTime() / 1000) : 0);
          if (!timestampSec) return '';
          const d = new Date(timestampSec * 1000);
          if (tickMarkType === 0) {
            return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' });
          }
          if (tickMarkType === 1) {
            return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' });
          }
          if (tickMarkType === 2) {
            return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });
          }
          return d.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        },
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
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
        lastValueVisible: false, // Right-axis badge is governed by exact real-price line
        autoscaleInfoProvider: (original) => {
          const res = original();
          if (res !== null && res.priceRange) {
            const diff = res.priceRange.maxValue - res.priceRange.minValue;
            const mid = (res.priceRange.maxValue + res.priceRange.minValue) / 2;
            const minSpread = Math.max(mid * 0.05, 1.0);
            if (diff < minSpread) {
              return {
                priceRange: {
                  minValue: mid - minSpread / 2,
                  maxValue: mid + minSpread / 2,
                },
                margins: res.margins,
              };
            }
          }
          return res;
        },
      });
      mainSeriesRef.current = candleSeries;
    } else {
      const areaSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(56, 189, 248, 0.4)',
        bottomColor: 'rgba(56, 189, 248, 0.0)',
        lineColor: '#38bdf8',
        lineWidth: 2,
        autoscaleInfoProvider: (original) => {
          const res = original();
          if (res !== null && res.priceRange) {
            const diff = res.priceRange.maxValue - res.priceRange.minValue;
            const mid = (res.priceRange.maxValue + res.priceRange.minValue) / 2;
            const minSpread = Math.max(mid * 0.05, 1.0);
            if (diff < minSpread) {
              return {
                priceRange: {
                  minValue: mid - minSpread / 2,
                  maxValue: mid + minSpread / 2,
                },
                margins: res.margins,
              };
            }
          }
          return res;
        },
      });
      mainSeriesRef.current = areaSeries;
    }

    // Add Volume Histogram Series (isolated to volume_scale so it doesn't pollute price scale)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
    });
    chart.priceScale('volume_scale').applyOptions({
      scaleMargins: {
        top: 0.86,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Handle crosshair hover legend: Reads genuine real trade OHLC from candleMapRef
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time) {
        setHoverData(null);
        return;
      }
      const realCandle = candleMapRef.current.get(param.time);
      if (realCandle) {
        setHoverData({
          time: param.time,
          open: realCandle.open,
          high: realCandle.high,
          low: realCandle.low,
          close: realCandle.close,
          volume: realCandle.volume ?? 0,
        });
      } else if (param.seriesData) {
        const priceData = param.seriesData.get(mainSeriesRef.current);
        const volData = param.seriesData.get(volumeSeriesRef.current);
        if (priceData) {
          setHoverData({
            time: param.time,
            open: priceData.open ?? priceData.value,
            high: priceData.high ?? priceData.value,
            low: priceData.low ?? priceData.value,
            close: priceData.close ?? priceData.value,
            volume: volData?.value ?? null,
          });
        }
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
        realPriceLineRef.current = null;
      }
    };
  }, [chartMode]);

  // Converts raw backend candles into visual rendering data while keeping 100% genuine real trade OHLC in candleMapRef
  const formatCandleData = useCallback((sortedCandles, currentPrice) => {
    candleMapRef.current.clear();
    const formattedCandles = [];
    const formattedVolumes = [];

    for (let i = 0; i < sortedCandles.length; i++) {
      const c = sortedCandles[i];
      const timeSec = c.time;
      const rawOpen = Number(c.open || c.close || currentPrice);
      const rawClose = Number(c.close || rawOpen);
      const rawHigh = Number(c.high || Math.max(rawOpen, rawClose));
      const rawLow = Number(c.low || Math.min(rawOpen, rawClose));
      const vol = Number(c.volume || 0);

      const isFlat = Math.abs(rawHigh - rawLow) < 0.0001 || (rawHigh === rawLow && rawOpen === rawClose);

      // Determine bullish vs bearish based on HOLC & price movement relative to prior trade
      let isBullish = true;
      if (rawClose > rawOpen) {
        isBullish = true;
      } else if (rawClose < rawOpen) {
        isBullish = false;
      } else {
        // rawClose === rawOpen: Compare with previous trade price!
        if (i > 0) {
          const prevClose = Number(sortedCandles[i - 1].close || sortedCandles[i - 1].open || rawClose);
          if (rawClose < prevClose) {
            isBullish = false; // Price dropped from previous trade -> RED!
          } else if (rawClose > prevClose) {
            isBullish = true; // Price rose from previous trade -> GREEN!
          } else {
            if (rawHigh > rawClose && rawLow === rawClose) {
              isBullish = false;
            } else {
              isBullish = true;
            }
          }
        } else {
          isBullish = true;
        }
      }

      // 100% genuine real trade data stored for sheet, tooltips, legend & crosshairs
      const realCandle = {
        time: timeSec,
        open: rawOpen,
        high: rawHigh,
        low: rawLow,
        close: rawClose,
        volume: vol,
        isBullish,
        isFlat,
      };
      candleMapRef.current.set(timeSec, realCandle);

      const candleColor = isBullish ? '#10b981' : '#ef4444';

      // For flat candles (same H O C L), render a clean solid body with proper bullish/bearish orientation
      let visualOpen = rawOpen;
      let visualClose = rawClose;
      let visualHigh = rawHigh;
      let visualLow = rawLow;

      if (isFlat) {
        const halfBody = Math.max(rawClose * 0.0015, 0.2);
        if (isBullish) {
          visualOpen = rawClose - halfBody;
          visualClose = rawClose + halfBody;
          visualHigh = visualClose;
          visualLow = visualOpen;
        } else {
          visualOpen = rawClose + halfBody;
          visualClose = rawClose - halfBody;
          visualHigh = visualOpen;
          visualLow = visualClose;
        }
      }

      formattedCandles.push({
        time: timeSec,
        open: visualOpen,
        high: visualHigh,
        low: visualLow,
        close: visualClose,
        color: candleColor,
        borderColor: candleColor,
        wickColor: candleColor,
        value: rawClose, // For Area mode
      });

      formattedVolumes.push({
        time: timeSec,
        value: vol,
        color: isBullish ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
      });
    }

    return { formattedCandles, formattedVolumes };
  }, []);

  // 2. Fetch Velocity Backend Candles and set data
  const loadCandleData = useCallback(async () => {
    setLoading(true);

    try {
      const stepSec = getIntervalSeconds(interval);

      let candleList = [];
      try {
        const fetchInterval = interval === '30m' ? '15m' : interval;
        const fetchLimit = interval === '30m' ? 300 : 150;
        const res = await marketApi.getCandles(cleanSymbol, fetchInterval, fetchLimit);
        const raw = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        if (raw && raw.length > 0) {
          if (interval === '30m') {
            const bucketMap = new Map();
            const sorted15 = [...raw].sort((a, b) => new Date(a.open_time).getTime() - new Date(b.open_time).getTime());
            for (const c of sorted15) {
              const d = new Date(c.open_time);
              const sec = Math.floor(d.getTime() / 1000);
              const bSec = Math.floor(sec / 1800) * 1800;
              const bIso = new Date(bSec * 1000).toISOString();
              const existing = bucketMap.get(bSec);
              if (!existing) {
                bucketMap.set(bSec, {
                  open_time: bIso,
                  open: Number(c.open || c.close),
                  high: Number(c.high || c.close),
                  low: Number(c.low || c.close),
                  close: Number(c.close),
                  volume: Number(c.volume || 0),
                });
              } else {
                existing.high = Math.max(existing.high, Number(c.high || c.close));
                existing.low = Math.min(existing.low, Number(c.low || c.close));
                existing.close = Number(c.close);
                existing.volume += Number(c.volume || 0);
              }
            }
            candleList = Array.from(bucketMap.values());
          } else {
            candleList = raw;
          }
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
        } catch { }
      }

      // Apply dynamic timescale options based on interval
      if (chartInstanceRef.current) {
        chartInstanceRef.current.timeScale().applyOptions({
          timeVisible: interval !== '1d',
          secondsVisible: interval === '1m',
        });
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const nowBucket = Math.floor(nowSec / stepSec) * stepSec;
      let rawPoints = [];

      if (candleList.length > 0) {
        const sorted = [...candleList].sort((a, b) => new Date(a.open_time).getTime() - new Date(b.open_time).getTime());

        let lastTimeSec = 0;
        for (let i = 0; i < sorted.length; i++) {
          const c = sorted[i];
          const d = new Date(c.open_time);
          let parsedSec = !isNaN(d.getTime()) && d.getFullYear() > 2020
            ? Math.floor(d.getTime() / 1000)
            : (nowBucket - (sorted.length - i) * stepSec);

          let timeSec = parsedSec;
          if (timeSec <= lastTimeSec) {
            timeSec = lastTimeSec + stepSec;
          }
          lastTimeSec = timeSec;

          rawPoints.push({
            time: timeSec,
            open: Number(c.open || c.close || currentPrice),
            close: Number(c.close || c.open || currentPrice),
            high: Number(c.high || Math.max(Number(c.open || currentPrice), Number(c.close || currentPrice))),
            low: Number(c.low || Math.min(Number(c.open || currentPrice), Number(c.close || currentPrice))),
            volume: Number(c.volume || 0),
          });
        }
      } else if (currentPrice > 0) {
        // If no past trades exist yet for this product, anchor 1 single real baseline point at current trade price (NO DUMMY CANDLES)
        rawPoints = [
          {
            time: nowBucket,
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
            volume: 0,
          },
        ];
      }

      const { formattedCandles, formattedVolumes } = formatCandleData(rawPoints, currentPrice);

      if (mainSeriesRef.current && chartInstanceRef.current) {
        mainSeriesRef.current.setData(formattedCandles);
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(formattedVolumes);
        }

        chartInstanceRef.current.timeScale().applyOptions({
          barSpacing: 16,
          rightOffset: 12,
        });
        chartInstanceRef.current.timeScale().scrollToRealtime();

        if (formattedCandles.length > 0) {
          const latestReal = candleMapRef.current.get(formattedCandles[formattedCandles.length - 1].time) || formattedCandles[formattedCandles.length - 1];
          lastCandleRef.current = latestReal;
          setCurrentCandle(latestReal);
          updatePriceLine(latestReal.close, latestReal.isBullish);
        }
      }
    } catch (err) {
      console.error('[PriceChart] Failed to load native candles:', err);
    } finally {
      setLoading(false);
    }
  }, [cleanSymbol, interval, chartMode, externalPrice, formatCandleData, updatePriceLine]);

  // Run on mount or symbol/interval/mode change
  useEffect(() => {
    loadCandleData();
  }, [loadCandleData]);

  // React immediately to live price changes (e.g. order executed, buy product, ticker tick)
  useEffect(() => {
    if (!externalPrice || Number(externalPrice) <= 0 || !mainSeriesRef.current) return;
    const newPrice = Number(externalPrice);

    if (!lastCandleRef.current) {
      loadCandleData();
      return;
    }

    if (lastCandleRef.current.close === newPrice && lastCandleRef.current.value === newPrice) return;

    const timeSec = lastCandleRef.current.time;
    const rawOpen = Number(lastCandleRef.current.open || newPrice);
    const rawHigh = Math.max(Number(lastCandleRef.current.high || newPrice), newPrice);
    const rawLow = Math.min(Number(lastCandleRef.current.low || newPrice), newPrice);
    const rawClose = newPrice;
    const isFlat = Math.abs(rawHigh - rawLow) < 0.0001 || (rawHigh === rawLow && rawOpen === rawClose);

    let isBullish = true;
    if (rawClose > rawOpen) {
      isBullish = true;
    } else if (rawClose < rawOpen) {
      isBullish = false;
    } else {
      isBullish = lastCandleRef.current.isBullish !== undefined ? lastCandleRef.current.isBullish : true;
    }

    const realCandle = {
      time: timeSec,
      open: rawOpen,
      high: rawHigh,
      low: rawLow,
      close: rawClose,
      volume: lastCandleRef.current.volume || 0,
      isBullish,
      isFlat,
    };
    candleMapRef.current.set(timeSec, realCandle);

    const candleColor = isBullish ? '#10b981' : '#ef4444';
    let visualOpen = rawOpen;
    let visualClose = rawClose;
    let visualHigh = rawHigh;
    let visualLow = rawLow;

    if (isFlat) {
      const halfBody = Math.max(rawClose * 0.0015, 0.2);
      if (isBullish) {
        visualOpen = rawClose - halfBody;
        visualClose = rawClose + halfBody;
        visualHigh = visualClose;
        visualLow = visualOpen;
      } else {
        visualOpen = rawClose + halfBody;
        visualClose = rawClose - halfBody;
        visualHigh = visualOpen;
        visualLow = visualClose;
      }
    }

    const visualUpdate = {
      time: timeSec,
      open: visualOpen,
      high: visualHigh,
      low: visualLow,
      close: visualClose,
      color: candleColor,
      borderColor: candleColor,
      wickColor: candleColor,
      value: rawClose,
    };

    lastCandleRef.current = realCandle;
    mainSeriesRef.current.update(visualUpdate);
    setCurrentCandle(realCandle);
    updatePriceLine(newPrice, isBullish);
  }, [externalPrice, loadCandleData, updatePriceLine]);

  // 3. Real-Time WebSocket Subscription to Velocity Engine (/ws)
  useEffect(() => {
    if (chartMode === 'tradingview') return;

    setWsConnected(true);
    const unsubscribe = marketWs.subscribe(cleanSymbol, (msg) => {
      // A. Real-Time Kline/Candlestick update
      if (msg.type === 'kline' && msg.data) {
        const k = msg.data;
        const timeSec = formatTime(k.open_time, Math.floor(Date.now() / 1000));
        const rawOpen = Number(k.open);
        const rawHigh = Number(k.high);
        const rawLow = Number(k.low);
        const rawClose = Number(k.close);
        const volume = Number(k.volume || 0);

        const isFlat = Math.abs(rawHigh - rawLow) < 0.0001 || (rawHigh === rawLow && rawOpen === rawClose);

        let isBullish = true;
        if (rawClose > rawOpen) {
          isBullish = true;
        } else if (rawClose < rawOpen) {
          isBullish = false;
        } else {
          isBullish = lastCandleRef.current?.isBullish !== undefined ? lastCandleRef.current.isBullish : true;
        }

        const realCandle = {
          time: timeSec,
          open: rawOpen,
          high: rawHigh,
          low: rawLow,
          close: rawClose,
          volume,
          isBullish,
          isFlat,
        };
        candleMapRef.current.set(timeSec, realCandle);

        const candleColor = isBullish ? '#10b981' : '#ef4444';
        let visualOpen = rawOpen;
        let visualClose = rawClose;
        let visualHigh = rawHigh;
        let visualLow = rawLow;

        if (isFlat) {
          const halfBody = Math.max(rawClose * 0.0015, 0.2);
          if (isBullish) {
            visualOpen = rawClose - halfBody;
            visualClose = rawClose + halfBody;
            visualHigh = visualClose;
            visualLow = visualOpen;
          } else {
            visualOpen = rawClose + halfBody;
            visualClose = rawClose - halfBody;
            visualHigh = visualOpen;
            visualLow = visualClose;
          }
        }

        const visualUpdate = {
          time: timeSec,
          open: visualOpen,
          high: visualHigh,
          low: visualLow,
          close: visualClose,
          color: candleColor,
          borderColor: candleColor,
          wickColor: candleColor,
          value: rawClose,
        };

        if (mainSeriesRef.current) {
          mainSeriesRef.current.update(visualUpdate);
        }
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.update({
            time: timeSec,
            value: volume,
            color: isBullish ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          });
        }

        lastCandleRef.current = realCandle;
        setCurrentCandle(realCandle);
        updatePriceLine(rawClose, isBullish);
      }

      // B. Real-Time Trade update
      if (msg.type === 'trade' && msg.data) {
        const tradePrice = Number(msg.data.price);
        const tradeQty = Number(msg.data.quantity);
        const nowSec = Math.floor(Date.now() / 1000);

        if (lastCandleRef.current) {
          const current = { ...lastCandleRef.current };
          current.high = Math.max(Number(current.high || tradePrice), tradePrice);
          current.low = Math.min(Number(current.low || tradePrice), tradePrice);
          const prevClose = Number(current.close || tradePrice);
          current.close = tradePrice;
          current.value = tradePrice;
          current.volume = (current.volume || 0) + tradeQty;
          current.isFlat = Math.abs(current.high - current.low) < 0.0001;

          let isBullish = true;
          if (tradePrice > current.open) {
            isBullish = true;
          } else if (tradePrice < current.open) {
            isBullish = false;
          } else {
            if (tradePrice < prevClose) {
              isBullish = false;
            } else if (tradePrice > prevClose) {
              isBullish = true;
            } else {
              isBullish = current.isBullish !== undefined ? current.isBullish : true;
            }
          }
          current.isBullish = isBullish;

          candleMapRef.current.set(current.time, current);

          const candleColor = isBullish ? '#10b981' : '#ef4444';
          let visualOpen = current.open;
          let visualClose = tradePrice;
          let visualHigh = current.high;
          let visualLow = current.low;

          if (current.isFlat) {
            const halfBody = Math.max(tradePrice * 0.0015, 0.2);
            if (isBullish) {
              visualOpen = tradePrice - halfBody;
              visualClose = tradePrice + halfBody;
              visualHigh = visualClose;
              visualLow = visualOpen;
            } else {
              visualOpen = tradePrice + halfBody;
              visualClose = tradePrice - halfBody;
              visualHigh = visualOpen;
              visualLow = visualClose;
            }
          }

          const visualUpdate = {
            time: current.time,
            open: visualOpen,
            high: visualHigh,
            low: visualLow,
            close: visualClose,
            color: candleColor,
            borderColor: candleColor,
            wickColor: candleColor,
            value: tradePrice,
          };

          if (mainSeriesRef.current) {
            mainSeriesRef.current.update(visualUpdate);
          }
          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.update({
              time: current.time,
              value: current.volume,
              color: isBullish ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
            });
          }
          lastCandleRef.current = current;
          setCurrentCandle(current);
          updatePriceLine(tradePrice, isBullish);
        } else {
          const isBullish = true;
          const candleColor = '#10b981';
          const newPoint = {
            time: nowSec,
            open: tradePrice,
            high: tradePrice,
            low: tradePrice,
            close: tradePrice,
            volume: tradeQty,
            isBullish: true,
            isFlat: true,
          };
          candleMapRef.current.set(nowSec, newPoint);

          const halfBody = Math.max(tradePrice * 0.0015, 0.2);
          if (mainSeriesRef.current) {
            mainSeriesRef.current.update({
              time: nowSec,
              open: tradePrice - halfBody,
              high: tradePrice + halfBody,
              low: tradePrice - halfBody,
              close: tradePrice + halfBody,
              color: candleColor,
              borderColor: candleColor,
              wickColor: candleColor,
              value: tradePrice,
            });
          }
          lastCandleRef.current = newPoint;
          setCurrentCandle(newPoint);
          updatePriceLine(tradePrice, isBullish);
        }
      }
    });

    return () => {
      setWsConnected(false);
      unsubscribe();
    };
  }, [cleanSymbol, chartMode, updatePriceLine]);

  const activeDisplay = hoverData || currentCandle || (Number(externalPrice) > 0 ? {
    open: Number(externalPrice),
    high: Number(externalPrice),
    low: Number(externalPrice),
    close: Number(externalPrice),
    volume: null,
  } : null);

  return (
    <div className="h-full w-full bg-surface border border-border rounded-lg overflow-hidden flex flex-col relative">
      {/* Top Chart Header / Controls */}
      <div className="p-2 px-4 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-[#0f172a]/80">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Chart Mode Toggle */}
          <div className="flex items-center gap-1 bg-background/90 p-0.5 rounded-lg border border-border/60">
            <button
              onClick={() => setChartMode('candles')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${chartMode === 'candles'
                  ? 'bg-primary text-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              <BarChart2 size={13} />
              Candles
            </button>
            <button
              onClick={() => setChartMode('area')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${chartMode === 'area'
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
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${isDrawingTrendline
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
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${interval === int.value
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

        {/* Zoom Controls & Refresh */}
        <div className="flex items-center gap-1 bg-background/90 p-0.5 rounded-lg border border-border/60">
          <button
            onClick={handleZoomIn}
            title="Zoom In / Increase Candle Size (+)"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-border/60 transition-colors"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out / Decrease Candle Size (-)"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-border/60 transition-colors"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={handleFitContent}
            title="Fit All Candles"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-border/60 transition-colors"
          >
            <Maximize2 size={13} />
          </button>
          <div className="h-3.5 w-px bg-border/60 mx-0.5"></div>
          <button
            onClick={loadCandleData}
            title="Reload Chart Data"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-border/60 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-primary' : ''} />
          </button>
        </div>
      </div>

      {/* OHLCV Legend Bar (shows current/hovered candle values) */}
      <div className="px-4 py-1.5 bg-[#0f172a] border-b border-border/40 flex items-center gap-4 text-[11px] font-mono text-gray-400 overflow-x-auto select-none">
        <span className="font-bold text-white tracking-wide">{cleanSymbol}</span>
        {activeDisplay ? (
          <>
            {activeDisplay.time && (
              <div className="text-gray-300">
                Time: <span className="text-white font-medium">
                  {new Date((typeof activeDisplay.time === 'number' ? activeDisplay.time : 0) * 1000).toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                  })} IST
                </span>
              </div>
            )}
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
              C: <span className={`font-semibold ${Number(activeDisplay.close) > Number(activeDisplay.open)
                  ? 'text-emerald-400'
                  : (Number(activeDisplay.close) < Number(activeDisplay.open)
                    ? 'text-rose-400'
                    : (activeDisplay.isBullish !== false ? 'text-emerald-400' : 'text-rose-400'))
                }`}>
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
          className={`absolute inset-0 w-full h-full z-20 ${isDrawingTrendline ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
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
