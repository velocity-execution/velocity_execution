/**
 * Velocity Market Data WebSocket Service
 * Connects to the Go backend /ws endpoint for real-time market data:
 * - kline (candlesticks)
 * - trade (recent executions)
 * - depth (orderbook updates)
 * - ticker (24h price updates)
 */

class MarketWebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map(); // symbol -> Set of callback functions
    this.connected = false;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.activeSubscriptions = new Set();
  }

  getWsUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use the Vite proxy /ws path, fallback to direct port 8080
    return `${protocol}//${window.location.host}/ws`;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const url = this.getWsUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected = true;
        // Resubscribe to any active symbols
        for (const symbol of this.activeSubscriptions) {
          this.sendSubscribe(symbol);
        }

        // Start ping heartbeat every 25 seconds
        clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pong') return;

          // Dispatch to symbol subscribers (normalize symbol to match subscriber keys)
          const rawSymbol = msg.symbol || (typeof msg.data === 'string' ? msg.data : null);
          if (rawSymbol) {
            const clean = rawSymbol.replace('/', '').replace('_', '').toUpperCase();
            if (this.subscribers.has(clean)) {
              const cbs = this.subscribers.get(clean);
              for (const cb of cbs) {
                cb(msg);
              }
            }
          }
        } catch (err) {
          console.warn('[marketWs] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        clearInterval(this.pingTimer);
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[marketWs] Connection error:', err);
        this.ws?.close();
      };
    } catch (err) {
      console.warn('[marketWs] Connection setup failed:', err);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  sendSubscribe(symbol) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', symbol }));
      if (symbol.endsWith('USDT') && !symbol.includes('_')) {
        const underscored = symbol.replace(/USDT$/, '_USDT');
        this.ws.send(JSON.stringify({ action: 'subscribe', symbol: underscored }));
      }
    }
  }

  sendUnsubscribe(symbol) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'unsubscribe', symbol }));
      if (symbol.endsWith('USDT') && !symbol.includes('_')) {
        const underscored = symbol.replace(/USDT$/, '_USDT');
        this.ws.send(JSON.stringify({ action: 'unsubscribe', symbol: underscored }));
      }
    }
  }

  /**
   * Subscribe to real-time events for a symbol
   * @param {string} symbol - e.g. "BNBUSDT"
   * @param {function} callback - handler(msg)
   * @returns {function} unsubscribe function
   */
  subscribe(symbol, callback) {
    const clean = symbol.replace('/', '').replace('_', '').toUpperCase();

    if (!this.subscribers.has(clean)) {
      this.subscribers.set(clean, new Set());
    }
    this.subscribers.get(clean).add(callback);
    this.activeSubscriptions.add(clean);

    if (!this.connected) {
      this.connect();
    } else {
      this.sendSubscribe(clean);
    }

    return () => {
      const cbs = this.subscribers.get(clean);
      if (cbs) {
        cbs.delete(callback);
        if (cbs.size === 0) {
          this.subscribers.delete(clean);
          this.activeSubscriptions.delete(clean);
          this.sendUnsubscribe(clean);
        }
      }
    };
  }
}

export const marketWs = new MarketWebSocketService();
