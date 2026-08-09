// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Access-token authority for the admin UI.
 *
 * Every outbound call resolves its bearer token through here instead of capturing
 * a token string when a client is constructed. Capturing is what produced the
 * admin 401s: clients built during store rehydration held no token at all, and
 * clients built before a refresh kept sending the rotated-out one.
 *
 * Also breaks the circular dependency between apiClient and authStore — authStore
 * injects the refresh implementation via `registerRefreshHandler`.
 */

import { getItem, removeItem } from './storage';
import { logger } from '@/lib/logger';
import { config } from '@/config';

export const TOKEN_STORAGE_KEY = 'openid_tokens';

export interface StoredTokens {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  /** Absolute expiry in Unix seconds, as issued by the token endpoint. */
  expires_at?: number;
}

type RefreshTokensFn = () => Promise<void>;

let refreshTokensImpl: RefreshTokensFn | null = null;

/** Register the refresh implementation owned by authStore. */
export function registerRefreshHandler(refreshFn: RefreshTokensFn) {
  refreshTokensImpl = refreshFn;
}

/** Read the persisted token set, treating any storage failure as "no session". */
export async function readStoredTokens(): Promise<StoredTokens | null> {
  try {
    return await getItem<StoredTokens>(TOKEN_STORAGE_KEY);
  } catch (error) {
    logger.warn('tokenRefresh: unable to read stored tokens', error);
    return null;
  }
}

/** True when the stored access token is missing, expired, or inside the renewal skew. */
export function needsRenewal(tokens: StoredTokens | null): boolean {
  if (!tokens?.access_token) return true;
  // No expiry recorded: nothing to pre-empt, let the server rule on it.
  if (!tokens.expires_at) return false;
  return Date.now() >= tokens.expires_at * 1000 - config.auth.refreshSkewMs;
}

/** A dead refresh grant — replaying it only produces more failures. */
function isInvalidGrant(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('invalid_grant') ||
    message.includes('token is not active') ||
    (message.includes('refresh token') && message.includes('expired'))
  );
}

async function runRefresh(): Promise<boolean> {
  if (!refreshTokensImpl) {
    logger.warn('tokenRefresh: handler not registered');
    return false;
  }

  try {
    const tokens = await readStoredTokens();
    if (!tokens?.refresh_token) {
      logger.info('tokenRefresh: no refresh token present');
      return false;
    }

    await refreshTokensImpl();

    const renewed = await readStoredTokens();
    if (renewed?.access_token) {
      logger.debug('tokenRefresh: renewed access token');
      return true;
    }
    logger.warn('tokenRefresh: refresh completed but no access token was stored');
    return false;
  } catch (error) {
    logger.error('tokenRefresh: refresh failed', error);
    if (isInvalidGrant(error)) {
      try {
        await removeItem(TOKEN_STORAGE_KEY);
      } catch (clearError) {
        logger.error('tokenRefresh: failed to clear invalid tokens', clearError);
      }
    }
    return false;
  }
}

let inFlightRefresh: Promise<boolean> | null = null;

/**
 * Refresh the token set, single-flight: concurrent callers (a page mounting six
 * panels at once) share one round trip instead of racing to rotate the refresh
 * token against each other.
 */
export function attemptTokenRefresh(): Promise<boolean> {
  inFlightRefresh ??= runRefresh().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

/**
 * The access token to send right now — renewed first when it is expired or about
 * to be. Returns null when there is no usable session, so callers send no
 * Authorization header rather than one the server is certain to reject.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await readStoredTokens();
  if (!needsRenewal(tokens)) return tokens?.access_token ?? null;
  if (!tokens?.refresh_token) return tokens?.access_token ?? null;

  await attemptTokenRefresh();
  return (await readStoredTokens())?.access_token ?? null;
}
