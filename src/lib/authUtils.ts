/**
 * Utility functions to normalize and extract authentication tokens from URLs.
 * 
 * Supabase password recovery links may arrive in various malformed formats:
 * - #access_token=...
 * - #/access_token=...
 * - //#access_token=...
 * - ?access_token=...
 * 
 * This module provides robust parsing to handle all these variations.
 */

export interface AuthTokens {
  access_token: string | null;
  refresh_token: string | null;
  type: string | null;
  code: string | null;
  error: string | null;
  error_description: string | null;
}

/**
 * Normalizes a hash string by removing malformed prefixes like '#/', '//', '#//', etc.
 * @param hash - The raw hash string from window.location.hash
 * @returns A cleaned hash string suitable for URLSearchParams
 */
export function normalizeHash(hash: string): string {
  if (!hash) return '';
  
  // Remove leading # if present
  let normalized = hash.startsWith('#') ? hash.substring(1) : hash;
  
  // Remove leading slashes and combinations like '/', '//', etc.
  normalized = normalized.replace(/^\/+/, '');
  
  return normalized;
}

/**
 * Extracts authentication tokens from the URL hash.
 * Handles malformed URLs with extra slashes or hash characters.
 * 
 * @returns AuthTokens object with extracted token values (or null if not found)
 */
export function getAuthTokensFromHash(): AuthTokens {
  const hash = normalizeHash(window.location.hash);
  const params = new URLSearchParams(hash);
  
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'),
    code: params.get('code'),
    error: params.get('error'),
    error_description: params.get('error_description'),
  };
}

/**
 * Extracts authentication tokens from URL query params.
 * Some OAuth flows may use query params instead of hash fragments.
 * 
 * @returns AuthTokens object with extracted token values (or null if not found)
 */
export function getAuthTokensFromQuery(): AuthTokens {
  const params = new URLSearchParams(window.location.search);
  
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'),
    code: params.get('code'),
    error: params.get('error'),
    error_description: params.get('error_description'),
  };
}

/**
 * Tries to extract auth tokens from both hash and query params.
 * Prioritizes hash over query params since that's the Supabase default.
 * 
 * @returns AuthTokens object with the best available token values
 */
export function getAuthTokens(): AuthTokens {
  const hashTokens = getAuthTokensFromHash();
  const queryTokens = getAuthTokensFromQuery();
  
  // Prefer hash tokens over query tokens
  return {
    access_token: hashTokens.access_token || queryTokens.access_token,
    refresh_token: hashTokens.refresh_token || queryTokens.refresh_token,
    type: hashTokens.type || queryTokens.type,
    code: hashTokens.code || queryTokens.code,
    error: hashTokens.error || queryTokens.error,
    error_description: hashTokens.error_description || queryTokens.error_description,
  };
}

/**
 * Checks if the current URL contains a password recovery token.
 * 
 * @returns True if recovery tokens are present
 */
export function isRecoveryUrl(): boolean {
  const tokens = getAuthTokens();
  return tokens.type === 'recovery' && !!tokens.access_token;
}

/**
 * Clears the URL hash without triggering a page reload.
 * This is important for security to avoid exposing tokens in the URL.
 */
export function clearUrlHash(): void {
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
