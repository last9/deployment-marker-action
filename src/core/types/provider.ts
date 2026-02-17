/**
 * Provider interfaces for external dependencies
 */

import type { ChangeEvent, ChangeEventResponse } from './event';

/**
 * API client interface for Last9 integration
 */
export interface ApiClient {
  /** Base URL for API */
  readonly baseUrl: string;

  /** API version */
  readonly version: string;

  /**
   * Send change event to Last9
   * @param orgSlug - Organization slug
   * @param event - Change event to send
   * @param accessToken - Access token for authentication
   * @returns API response
   */
  sendChangeEvent(
    orgSlug: string,
    event: ChangeEvent,
    accessToken: string
  ): Promise<ChangeEventResponse>;

  /**
   * Exchange refresh token for access token
   * @param refreshToken - Long-lived refresh token
   * @returns Token response with access token
   */
  refreshAccessToken(refreshToken: string): Promise<TokenResponse>;

  /**
   * Test API connectivity
   * @returns True if API is reachable
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Token response from OAuth endpoint
 */
export interface TokenResponse {
  /** Short-lived access token */
  access_token: string;

  /** Long-lived refresh token */
  refresh_token: string;

  /** Token type (always "Bearer") */
  type: 'Bearer';

  /** Token expiration timestamp (seconds since epoch) */
  expires_at: number;

  /** Token issuance timestamp (seconds since epoch) */
  issued_at: number;

  /** Token scopes */
  scopes: string[];
}

/**
 * Cached token with expiry
 */
export interface CachedToken {
  /** Access token */
  accessToken: string;

  /** Refresh token */
  refreshToken: string;

  /** Expiration date */
  expiresAt: Date;

  /** Cache timestamp */
  cachedAt: Date;
}

/**
 * Token manager interface
 */
export interface TokenManager {
  /**
   * Get valid access token (exchanges if needed)
   * @param refreshToken - Refresh token
   * @returns Valid access token
   */
  getAccessToken(refreshToken: string): Promise<string>;

  /**
   * Check if token is expired
   * @param expiresAt - Expiration timestamp (seconds since epoch)
   * @returns True if token is expired or expiring soon
   */
  isTokenExpired(expiresAt: number): boolean;

  /**
   * Clear token cache
   */
  clearCache(): void;
}

/**
 * Context provider interface
 */
export interface ContextProvider {
  /**
   * Get repository information
   */
  getRepository(): {
    owner: string;
    repo: string;
    fullName: string;
  };

  /**
   * Get workflow information
   */
  getWorkflow(): {
    name: string;
    runId: number;
    runNumber: number;
    runAttempt: number;
  };

  /**
   * Get commit information
   */
  getCommit(): {
    sha: string;
    ref: string;
    message: string;
  };

  /**
   * Get actor information
   */
  getActor(): {
    username: string;
    email?: string;
  };

  /**
   * Get event information
   */
  getEvent(): {
    name: string;
    type: string;
    payload: Record<string, unknown>;
  };

  /**
   * Get input value
   * @param name - Input name
   * @param required - Whether input is required
   * @returns Input value
   */
  getInput(name: string, required?: boolean): string;

  /**
   * Set output value
   * @param name - Output name
   * @param value - Output value
   */
  setOutput(name: string, value: string): void;

  /**
   * Mark value as secret (masks in logs)
   * @param value - Secret value
   */
  setSecret(value: string): void;
}

/**
 * Storage provider interface
 */
export interface StorageProvider {
  /**
   * Get value from storage
   * @param key - Storage key
   * @returns Stored value or undefined
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Set value in storage
   * @param key - Storage key
   * @param value - Value to store
   * @param ttl - Time to live in seconds
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete value from storage
   * @param key - Storage key
   */
  delete(key: string): Promise<void>;

  /**
   * Check if key exists
   * @param key - Storage key
   * @returns True if key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Clear all storage
   */
  clear(): Promise<void>;
}
