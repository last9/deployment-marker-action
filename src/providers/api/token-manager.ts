/**
 * Token manager for OAuth token lifecycle
 */

import type { TokenManager as ITokenManager, ApiClient, CachedToken } from '@core/types/provider';
import { TokenExchangeError } from '@utils/errors';
import { isExpired } from '@utils/time';
import { getLogger } from '@utils/logger';
import crypto from 'crypto';

/**
 * Token manager configuration
 */
export interface TokenManagerConfig {
  /** Buffer time before expiry (seconds) */
  expiryBufferSeconds?: number;
}

/**
 * Token manager implementation
 *
 * Handles OAuth token exchange and caching with automatic refresh
 */
export class TokenManager implements ITokenManager {
  private readonly cache = new Map<string, CachedToken>();
  private readonly logger = getLogger();
  private readonly expiryBufferSeconds: number;

  constructor(
    private readonly apiClient: ApiClient,
    config?: TokenManagerConfig
  ) {
    this.expiryBufferSeconds = config?.expiryBufferSeconds || 300; // 5 minutes default
  }

  /**
   * Get valid access token (exchanges if needed)
   */
  async getAccessToken(refreshToken: string): Promise<string> {
    const cacheKey = this.getCacheKey(refreshToken);
    const cached = this.cache.get(cacheKey);

    // Return cached token if still valid
    if (cached && !this.isTokenExpired(Math.floor(cached.expiresAt.getTime() / 1000))) {
      this.logger.debug('Using cached access token');
      return cached.accessToken;
    }

    // Exchange refresh token for new access token
    this.logger.debug('Cached token expired or not found, exchanging refresh token');

    try {
      const tokenResponse = await this.apiClient.refreshAccessToken(refreshToken);

      // Cache new token
      const cachedToken: CachedToken = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(tokenResponse.expires_at * 1000),
        cachedAt: new Date()
      };

      this.cache.set(cacheKey, cachedToken);

      this.logger.info('Access token obtained and cached', {
        expiresAt: cachedToken.expiresAt.toISOString(),
        cacheKey: cacheKey.substring(0, 8) + '...'
      });

      return tokenResponse.access_token;
    } catch (error) {
      this.logger.error('Token exchange failed', error as Error);

      // Clear cache on failure
      this.cache.delete(cacheKey);

      // Wrap error
      if (error instanceof Error) {
        throw new TokenExchangeError(
          `Failed to exchange refresh token: ${error.message}`,
          undefined,
          { originalError: error.name }
        );
      }

      throw new TokenExchangeError('Failed to exchange refresh token');
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt: number): boolean {
    return isExpired(expiresAt, this.expiryBufferSeconds);
  }

  /**
   * Clear token cache
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.debug(`Cleared token cache (${size} entries)`);
  }

  /**
   * Generate cache key from refresh token
   * Uses SHA-256 hash for security
   */
  private getCacheKey(refreshToken: string): string {
    return crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
