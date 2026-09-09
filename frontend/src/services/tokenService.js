/**
 * Token Management & Silent Background Refresh Service
 * 
 * Provides:
 * 1. refreshAccessToken() — Exchanges stored refresh_token for a fresh access_token.
 *    Includes a mutex-lock promise to prevent duplicate concurrent network requests.
 * 2. initBackgroundTokenRefresh() — Runs in the background, scheduling automated
 *    token renewals before the access token expires, and handling tab wakeups.
 * 3. parseJwt() & isTokenExpiringSoon() — JWT utilities.
 */

const API_BASE = '/api';

// In-flight refresh promise to prevent duplicate requests when multiple components trigger refresh
let activeRefreshPromise = null;
let backgroundTimerId = null;

/**
 * Safely decodes base64url-encoded JWT payload without external dependencies.
 */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn('[tokenService] Failed to parse JWT payload:', err.message);
    return null;
  }
}

/**
 * Checks if a JWT token is expired or within `bufferSeconds` of expiration.
 */
export function isTokenExpiringSoon(token, bufferSeconds = 60) {
  if (!token) return true;
  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) return true;
  const expiryMs = decoded.exp * 1000;
  const nowMs = Date.now();
  return (expiryMs - nowMs) <= (bufferSeconds * 1000);
}

/**
 * Retrieves the current access token from localStorage.
 */
export function getAccessToken() {
  const token = localStorage.getItem('access_token');
  if (!token || token === 'undefined' || token === 'null') return null;
  return token;
}

/**
 * Retrieves the stored refresh token from localStorage.
 */
export function getRefreshToken() {
  const token = localStorage.getItem('refresh_token');
  if (!token || token === 'undefined' || token === 'null') return null;
  return token;
}

/**
 * Saves new access and optional refresh token into storage.
 */
export function setTokens(accessToken, refreshToken = null) {
  if (accessToken) {
    localStorage.setItem('access_token', accessToken);
  }
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
}

/**
 * Clears authentication tokens and user state from storage.
 */
export function clearAuthSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  if (backgroundTimerId) {
    clearTimeout(backgroundTimerId);
    backgroundTimerId = null;
  }
}

/**
 * Requests a new access token from identity-service using the stored refresh_token.
 * Uses a singleton promise lock so concurrent callers share the same HTTP request.
 * 
 * @returns {Promise<string>} The fresh access token
 */
export async function refreshAccessToken() {
  // Return active request if already in-flight
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuthSession();
      throw new Error('No refresh token available');
    }

    try {
      console.log('[tokenService] Exchanging refresh token for new access token...');
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errMsg = data.error || data.message || `Refresh failed with status ${response.status}`;
        console.error('[tokenService] Token refresh rejected by identity-service:', errMsg);
        
        // Refresh token is expired, invalid, or revoked
        if (response.status === 401 || response.status === 400) {
          clearAuthSession();
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        throw new Error(errMsg);
      }

      // Handle standard identity-service envelope: { success: true, data: { access_token, expires_in } }
      const tokenData = data.data || data;
      const newAccessToken = tokenData.access_token;

      if (!newAccessToken) {
        throw new Error('Malformed token response from identity service');
      }

      // Persist the new access token
      setTokens(newAccessToken, tokenData.refresh_token);
      console.log('[tokenService] Successfully refreshed access token in background.');

      // Dispatch event for any reactive listeners
      window.dispatchEvent(new CustomEvent('auth:token_refreshed', {
        detail: { accessToken: newAccessToken, expiresIn: tokenData.expires_in }
      }));

      // Reschedule background refresh for the next cycle
      scheduleNextBackgroundRefresh(newAccessToken, tokenData.expires_in);

      return newAccessToken;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

/**
 * Schedules the next automated background refresh before token expiry.
 */
function scheduleNextBackgroundRefresh(accessToken, expiresInSeconds) {
  if (backgroundTimerId) {
    clearTimeout(backgroundTimerId);
    backgroundTimerId = null;
  }

  let refreshDelayMs = 0;

  if (expiresInSeconds && expiresInSeconds > 60) {
    // Refresh 2 minutes (120s) before expiry, or at 80% of token lifetime
    const leadTime = Math.min(120, Math.floor(expiresInSeconds * 0.2));
    refreshDelayMs = (expiresInSeconds - leadTime) * 1000;
  } else {
    // Derive from JWT claims
    const decoded = parseJwt(accessToken);
    if (decoded && decoded.exp) {
      const msUntilExpiry = (decoded.exp * 1000) - Date.now();
      refreshDelayMs = Math.max(msUntilExpiry - 120000, 10000); // 2 minutes before expiry, min 10s
    } else {
      // Default fallback: refresh in 12 minutes (for standard 15-minute token)
      refreshDelayMs = 12 * 60 * 1000;
    }
  }

  console.log(`[tokenService] Next background token refresh scheduled in ${Math.round(refreshDelayMs / 1000)}s`);

  backgroundTimerId = setTimeout(async () => {
    try {
      if (getRefreshToken()) {
        await refreshAccessToken();
      }
    } catch (err) {
      console.warn('[tokenService] Background token refresh error:', err.message);
    }
  }, refreshDelayMs);
}

/**
 * Initializes the background token refresh daemon.
 * 
 * 1. Checks current token status on boot.
 * 2. Refreshes immediately if expiring soon.
 * 3. Schedules periodic background renewals.
 * 4. Listens to visibility changes (tab wakeups).
 * 
 * @returns {Function} Cleanup function to stop background renewal
 */
export function initBackgroundTokenRefresh() {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    console.log('[tokenService] No refresh token found. Background refresh idle.');
    return () => {};
  }

  // If access token is already expired or expiring within 60s, refresh immediately
  if (isTokenExpiringSoon(accessToken, 60)) {
    refreshAccessToken().catch((err) => {
      console.warn('[tokenService] Initial background token refresh failed:', err.message);
    });
  } else {
    // Schedule based on current access token expiry
    scheduleNextBackgroundRefresh(accessToken);
  }

  // Handle tab visibility change (e.g. computer woke up or tab un-minimized)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      const currentToken = getAccessToken();
      if (isTokenExpiringSoon(currentToken, 90)) {
        console.log('[tokenService] Tab resumed with expiring token — refreshing now...');
        refreshAccessToken().catch(() => {});
      }
    }
  };

  // Handle storage change across multiple browser tabs
  const handleStorageChange = (e) => {
    if (e.key === 'access_token' && e.newValue) {
      scheduleNextBackgroundRefresh(e.newValue);
    } else if (e.key === 'refresh_token' && !e.newValue) {
      clearAuthSession();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('storage', handleStorageChange);

  // Return uninstaller / teardown function
  return () => {
    if (backgroundTimerId) {
      clearTimeout(backgroundTimerId);
      backgroundTimerId = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('storage', handleStorageChange);
  };
}
