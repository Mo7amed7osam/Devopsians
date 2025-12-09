/**
 * Tab Session Management Module
 * 
 * PURPOSE:
 * Each browser tab gets its own unique session ID that is NOT shared with other tabs.
 * This enables tab-isolated authentication and prevents session bleeding between tabs.
 * 
 * KEY BEHAVIORS:
 * - Each tab has a UNIQUE session ID
 * - Session IDs are NOT synced between tabs (unlike localStorage/cookies)
 * - New tabs generate NEW session IDs automatically
 * - Session ID is cleared when tab closes (automatic cleanup via sessionStorage)
 * - Uses sessionStorage (primary) with window.name as fallback
 * 
 * STORAGE STRATEGY:
 * 1. Primary: sessionStorage.setItem('tabSessionId', uuid)
 *    - Tab-specific storage
 *    - Auto-cleared on tab close
 *    - Not shared between tabs
 * 
 * 2. Fallback: window.name = 'tabSessionId:uuid'
 *    - Used if sessionStorage is blocked/unavailable
 *    - Also tab-specific
 *    - Persists only during tab lifetime
 * 
 * LIFECYCLE:
 * - Created: First call to getTabSessionId() in the tab
 * - Lives: Throughout the tab's lifetime
 * - Destroyed: When tab/window closes (automatic)
 * 
 * USAGE EXAMPLES:
 * ```javascript
 * import { getTabSessionId, attachTabIdToRequest } from './tabSession';
 * 
 * // Get current tab's unique ID
 * const tabId = getTabSessionId();
 * console.log(tabId); // "a7b3c4d5-e6f7-8901-2345-6789abcdef01"
 * 
 * // Attach to API request headers
 * const config = attachTabIdToRequest({ headers: {} });
 * // Returns: { headers: { 'X-Tab-Session-Id': 'uuid...' } }
 * 
 * // Or attach to request body
 * const payload = attachTabIdToRequest({ data: { user: 1 } }, 'body');
 * // Returns: { data: { user: 1, tabSessionId: 'uuid...' } }
 * ```
 * 
 * WHY THIS MATTERS:
 * - Allows multiple tabs with different login sessions
 * - Prevents auth token conflicts between tabs
 * - Backend can track which tab made which request
 * - Improves security and debugging capabilities
 * 
 * @module tabSession
 */

const TAB_SESSION_KEY = 'tabSessionId';

/**
 * Generates a cryptographically secure UUID v4
 * Uses crypto.randomUUID() with fallback for older browsers
 * 
 * @private
 * @returns {string} UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateUUID() {
  // Use native crypto API if available (modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback: Manual UUID v4 generation (RFC 4122 compliant)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Retrieves tab session ID from sessionStorage
 * 
 * @private
 * @returns {string|null} Session ID or null if not found/error
 */
function getFromSessionStorage() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(TAB_SESSION_KEY);
    }
  } catch (error) {
    console.warn('[TabSession] sessionStorage read failed:', error.message);
  }
  return null;
}

/**
 * Stores tab session ID in sessionStorage
 * 
 * @private
 * @param {string} id - Session ID to store
 * @returns {boolean} True if successful
 */
function setInSessionStorage(id) {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TAB_SESSION_KEY, id);
      return true;
    }
  } catch (error) {
    console.warn('[TabSession] sessionStorage write failed:', error.message);
  }
  return false;
}

/**
 * Retrieves tab session ID from window.name (fallback method)
 * Format: "tabSessionId:uuid" or "other-data|tabSessionId:uuid"
 * 
 * @private
 * @returns {string|null} Session ID or null if not found
 */
function getFromWindowName() {
  try {
    if (typeof window !== 'undefined' && window.name) {
      const match = window.name.match(/tabSessionId:([a-f0-9-]+)/i);
      return match ? match[1] : null;
    }
  } catch (error) {
    console.warn('[TabSession] window.name read failed:', error.message);
  }
  return null;
}

/**
 * Stores tab session ID in window.name (fallback method)
 * Preserves any existing window.name content
 * 
 * @private
 * @param {string} id - Session ID to store
 * @returns {boolean} True if successful
 */
function setInWindowName(id) {
  try {
    if (typeof window !== 'undefined') {
      const existing = window.name || '';
      const prefix = existing && !existing.includes('tabSessionId:') ? existing + '|' : '';
      window.name = prefix + `tabSessionId:${id}`;
      return true;
    }
  } catch (error) {
    console.warn('[TabSession] window.name write failed:', error.message);
  }
  return false;
}

/**
 * Gets or creates a unique session ID for the current browser tab
 * 
 * IMPORTANT: This ID is tab-specific and NOT shared with other tabs
 * 
 * First call in a tab:
 * - Checks sessionStorage for existing ID
 * - If not found, checks window.name (fallback)
 * - If still not found, generates new UUID
 * - Stores in sessionStorage (or window.name as fallback)
 * 
 * Subsequent calls:
 * - Returns the same ID for this tab
 * 
 * @public
 * @returns {string} UUID v4 string unique to this tab
 * 
 * @example
 * // Tab 1
 * const tab1Id = getTabSessionId(); // "a7b3c4d5-..."
 * 
 * // Tab 2 (different ID)
 * const tab2Id = getTabSessionId(); // "f9e8d7c6-..."
 * 
 * // Tab 1 again (same ID as before)
 * const tab1IdAgain = getTabSessionId(); // "a7b3c4d5-..." (same)
 */
export function getTabSessionId() {
  // Try sessionStorage first (primary method)
  let sessionId = getFromSessionStorage();
  
  // Fallback to window.name if sessionStorage unavailable
  if (!sessionId) {
    sessionId = getFromWindowName();
  }
  
  // Generate new ID if none exists
  if (!sessionId) {
    sessionId = generateUUID();
    
    // Try storing in sessionStorage
    const stored = setInSessionStorage(sessionId);
    
    // If sessionStorage failed, use window.name fallback
    if (!stored) {
      setInWindowName(sessionId);
    }
    
    console.log('[TabSession] New tab session created:', sessionId);
  }
  
  return sessionId;
}

/**
 * Attaches the tab session ID to an API request configuration
 * 
 * Can add the ID to either:
 * - Headers: X-Tab-Session-Id (default, recommended)
 * - Body: tabSessionId property (alternative)
 * 
 * @public
 * @param {Object} request - Request configuration object
 * @param {Object} [request.headers] - HTTP headers
 * @param {Object} [request.data] - Request body
 * @param {'header'|'body'} [target='header'] - Where to attach the ID
 * @returns {Object} Modified request object with tab ID attached
 * 
 * @example
 * // Attach to headers (recommended)
 * const config = attachTabIdToRequest({
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 * // Result: { headers: { Authorization: '...', 'X-Tab-Session-Id': 'uuid' } }
 * 
 * @example
 * // Attach to body
 * const body = attachTabIdToRequest({
 *   data: { userId: 123, action: 'login' }
 * }, 'body');
 * // Result: { data: { userId: 123, action: 'login', tabSessionId: 'uuid' } }
 */
export function attachTabIdToRequest(request = {}, target = 'header') {
  const tabId = getTabSessionId();
  
  if (target === 'body') {
    // Attach to request body/data
    return {
      ...request,
      data: {
        ...request.data,
        tabSessionId: tabId
      }
    };
  } else {
    // Attach to headers (default)
    return {
      ...request,
      headers: {
        ...request.headers,
        'X-Tab-Session-Id': tabId
      }
    };
  }
}

/**
 * Manually clears the tab session ID
 * 
 * NOTE: Rarely needed! sessionStorage auto-clears on tab close.
 * Use this only for:
 * - Explicit logout that should clear tab identity
 * - Testing/debugging purposes
 * - Forcing generation of new tab ID
 * 
 * @public
 * @returns {void}
 * 
 * @example
 * // Clear on logout
 * function logout() {
 *   clearAuthToken();
 *   clearTabSession(); // Optional: force new tab ID
 * }
 */
export function clearTabSession() {
  // Clear from sessionStorage
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TAB_SESSION_KEY);
    }
  } catch (error) {
    console.warn('[TabSession] Failed to clear sessionStorage:', error.message);
  }
  
  // Clear from window.name
  try {
    if (typeof window !== 'undefined' && window.name) {
      window.name = window.name.replace(/\|?tabSessionId:[a-f0-9-]+/i, '');
    }
  } catch (error) {
    console.warn('[TabSession] Failed to clear window.name:', error.message);
  }
  
  console.log('[TabSession] Tab session cleared');
}

/**
 * Gets diagnostic information about the current tab session
 * Useful for debugging and monitoring
 * 
 * @public
 * @returns {Object} Session information
 * @property {string} tabSessionId - Current tab's UUID
 * @property {string} storageMethod - 'sessionStorage', 'window.name', or 'none'
 * @property {boolean} isNewSession - True if no existing session was found
 * 
 * @example
 * const info = getTabSessionInfo();
 * console.log(info);
 * // {
 * //   tabSessionId: "a7b3c4d5-e6f7-8901-2345-6789abcdef01",
 * //   storageMethod: "sessionStorage",
 * //   isNewSession: false
 * // }
 */
export function getTabSessionInfo() {
  const fromSession = getFromSessionStorage();
  const fromWindow = getFromWindowName();
  
  return {
    tabSessionId: fromSession || fromWindow || 'not-initialized',
    storageMethod: fromSession ? 'sessionStorage' : fromWindow ? 'window.name' : 'none',
    isNewSession: !fromSession && !fromWindow
  };
}

// Default export for convenience
export default {
  getTabSessionId,
  attachTabIdToRequest,
  clearTabSession,
  getTabSessionInfo
};
