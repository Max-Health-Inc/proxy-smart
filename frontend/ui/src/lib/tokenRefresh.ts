// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Token refresh service - breaks circular dependency between apiClient and authStore
 * This module is imported by apiClient to handle token refresh without directly importing authStore
 */

import { getItem, removeItem } from './storage';
import { logger } from '@/lib/logger';

// Type for the refresh function that will be injected
type RefreshTokensFn = () => Promise<void>;

let refreshTokensImpl: RefreshTokensFn | null = null;

/**
 * Register the token refresh implementation from authStore
 * This should be called during authStore initialization
 */
export function registerRefreshHandler(refreshFn: RefreshTokensFn) {
  refreshTokensImpl = refreshFn;
}

/**
 * Attempt to refresh tokens using the registered handler
 * Returns true if refresh was successful and new tokens are available
 */
export async function attemptTokenRefresh(): Promise<boolean> {
  if (!refreshTokensImpl) {
    console.warn('Token refresh handler not registered');
    logger.warn('tokenRefresh: handler not registered');
    return false;
  }

  try {
    const tokens = await getItem<{refresh_token?: string}>('openid_tokens');
    
    if (!tokens?.refresh_token) {
      logger.info('tokenRefresh: no refresh token present');
      return false;
    }

    logger.info('tokenRefresh: invoking refreshTokensImpl');
    await refreshTokensImpl();
    
    // Verify refresh was successful by checking if we have new tokens
    const newTokens = await getItem<{access_token?: string}>('openid_tokens');
    if (newTokens?.access_token) {
      logger.info('tokenRefresh: refresh success, access token present');
      return true;
    } else {
      console.warn('Token refresh completed but no access token available');
      logger.warn('tokenRefresh: refresh completed but no access token');
      return false;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    logger.error('tokenRefresh: refresh failed', error);
    
    // Check if this is an invalid_grant error (refresh token expired/invalid)
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('invalid_grant') || 
          errorMessage.includes('token is not active') ||
          errorMessage.includes('refresh token') && errorMessage.includes('expired')) {
        console.warn('Refresh token is invalid/expired, clearing all tokens');
        logger.warn('tokenRefresh: invalid_grant detected, clearing tokens');
        // Clear invalid tokens to prevent repeated refresh attempts
        try {
          await removeItem('openid_tokens');
        } catch (clearError) {
          console.error('Failed to clear invalid tokens:', clearError);
          logger.error('tokenRefresh: failed to clear invalid tokens', clearError);
        }
      }
    }
    
    return false;
  }
}
