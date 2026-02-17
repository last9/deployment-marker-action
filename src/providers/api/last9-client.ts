/**
 * Last9 API client implementation
 */

import type { ApiClient, TokenResponse } from '@core/types/provider';
import type { ChangeEvent, ChangeEventResponse } from '@core/types/event';
import { buildUrl, createHttpError, createNetworkError, isSuccessStatus } from '@utils/http';
import { getLogger } from '@utils/logger';

/**
 * Last9 API client configuration
 */
export interface Last9ClientConfig {
  /** Base URL for Last9 API */
  baseUrl: string;

  /** API version */
  version?: string;

  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Last9 API v4 client implementation
 */
export class Last9ApiClient implements ApiClient {
  readonly baseUrl: string;
  readonly version: string;
  private readonly timeoutMs: number;
  private readonly logger = getLogger();

  constructor(config: Last9ClientConfig) {
    this.baseUrl = config.baseUrl;
    this.version = config.version || 'v4';
    this.timeoutMs = config.timeoutMs || 30000; // 30 second default
  }

  /**
   * Send change event to Last9
   */
  async sendChangeEvent(
    orgSlug: string,
    event: ChangeEvent,
    accessToken: string
  ): Promise<ChangeEventResponse> {
    const url = buildUrl(
      this.baseUrl,
      `/api/${this.version}/organizations/${orgSlug}/change_events`
    );

    const payload = this.buildEventPayload(event);

    this.logger.debug('Sending change event', {
      orgSlug,
      eventName: event.event_name,
      eventState: event.event_state,
      url
    });

    try {
      const response = await this.makeRequest(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-LAST9-API-TOKEN': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as Record<string, unknown>;

      this.logger.info('Change event sent successfully', {
        orgSlug,
        eventName: event.event_name,
        eventState: event.event_state
      });

      return {
        success: true,
        event_id: result['id'] as string | undefined,
        timestamp: (result['timestamp'] as string | undefined) || event.timestamp
      };
    } catch (error) {
      this.logger.error('Failed to send change event', error as Error, {
        orgSlug,
        eventName: event.event_name
      });
      throw error;
    }
  }

  /**
   * Exchange refresh token for access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const url = buildUrl(this.baseUrl, `/api/${this.version}/oauth/access_token`);

    this.logger.debug('Exchanging refresh token for access token');

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      const result = (await response.json()) as Record<string, unknown>;

      this.logger.info('Access token obtained successfully', {
        expiresAt: result['expires_at'],
        scopes: result['scopes']
      });

      return {
        access_token: result['access_token'] as string,
        refresh_token: (result['refresh_token'] as string | undefined) || refreshToken,
        type: 'Bearer',
        expires_at: result['expires_at'] as number,
        issued_at: (result['issued_at'] as number | undefined) || Math.floor(Date.now() / 1000),
        scopes: (result['scopes'] as string[]) || []
      };
    } catch (error) {
      this.logger.error('Token exchange failed', error as Error);
      throw error;
    }
  }

  /**
   * Test API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = buildUrl(this.baseUrl, '/health');
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {}
      });

      return isSuccessStatus(response.status);
    } catch {
      return false;
    }
  }

  /**
   * Make HTTP request with timeout
   */
  private async makeRequest(
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body?: string;
    }
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check for errors
      if (!isSuccessStatus(response.status)) {
        const errorBody = await response.text();
        let errorMessage = `API request failed with status ${response.status}`;

        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          // Use default error message if body is not JSON
        }

        throw createHttpError(response.status, errorMessage, {
          url,
          method: options.method,
          statusCode: response.status,
          'retry-after': response.headers.get('retry-after') || undefined
        });
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw createHttpError(408, `Request timeout after ${this.timeoutMs}ms`, {
          url,
          method: options.method
        });
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw createNetworkError(error);
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Build event payload for API
   */
  private buildEventPayload(event: ChangeEvent): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      event_name: event.event_name,
      event_state: event.event_state
    };

    if (event.timestamp) {
      payload['timestamp'] = event.timestamp;
    }

    if (event.data_source_name) {
      payload['data_source_name'] = event.data_source_name;
    }

    if (event.attributes && Object.keys(event.attributes).length > 0) {
      payload['attributes'] = event.attributes;
    }

    return payload;
  }
}
