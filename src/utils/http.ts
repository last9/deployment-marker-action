/**
 * HTTP utilities
 */

import { ApiError, NetworkError, TimeoutError, RateLimitError, ServerError } from './errors';

/**
 * HTTP status code categories
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TIMEOUT: 408,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

/**
 * Check if HTTP status code indicates success
 */
export function isSuccessStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

/**
 * Check if HTTP status code indicates client error
 */
export function isClientError(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500;
}

/**
 * Check if HTTP status code indicates server error
 */
export function isServerError(statusCode: number): boolean {
  return statusCode >= 500 && statusCode < 600;
}

/**
 * Check if HTTP status code is retryable
 */
export function isRetryableStatus(statusCode: number): boolean {
  // Retry on 5xx errors and 429 (rate limit)
  return isServerError(statusCode) || statusCode === HTTP_STATUS.TOO_MANY_REQUESTS;
}

/**
 * Parse Retry-After header
 * @param retryAfter - Retry-After header value
 * @returns Milliseconds to wait
 */
export function parseRetryAfter(retryAfter: string | undefined): number | undefined {
  if (!retryAfter) {
    return undefined;
  }

  // Try parsing as seconds
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return undefined;
}

/**
 * Create error from HTTP response
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @param context - Additional context
 * @returns Appropriate error instance
 */
export function createHttpError(
  statusCode: number,
  message: string,
  context?: Record<string, unknown>
): Error {
  if (statusCode === HTTP_STATUS.TOO_MANY_REQUESTS) {
    const retryAfter = parseRetryAfter(context?.['retry-after'] as string | undefined);
    return new RateLimitError(message, retryAfter, context);
  }

  if (statusCode === HTTP_STATUS.TIMEOUT || statusCode === HTTP_STATUS.GATEWAY_TIMEOUT) {
    return new TimeoutError(message, context);
  }

  if (isServerError(statusCode)) {
    return new ServerError(message, statusCode, context);
  }

  if (isClientError(statusCode)) {
    return new ApiError(message, statusCode, context);
  }

  return new ApiError(message, statusCode, context);
}

/**
 * Create error from network failure
 * @param error - Original error
 * @returns Appropriate error instance
 */
export function createNetworkError(error: Error): Error {
  const message = error.message || 'Network error occurred';

  // Check for timeout
  if (message.toLowerCase().includes('timeout')) {
    return new TimeoutError(message, { originalError: error.name });
  }

  // Generic network error
  return new NetworkError(message, { originalError: error.name });
}

/**
 * Build URL with path and query parameters
 * @param baseUrl - Base URL
 * @param path - URL path
 * @param params - Query parameters
 * @returns Complete URL
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string>
): string {
  // Remove trailing slash from base URL
  const base = baseUrl.replace(/\/$/, '');

  // Ensure path starts with slash
  const fullPath = path.startsWith('/') ? path : `/${path}`;

  // Build URL
  const url = `${base}${fullPath}`;

  // Add query parameters
  if (params && Object.keys(params).length > 0) {
    const query = new URLSearchParams(params).toString();
    return `${url}?${query}`;
  }

  return url;
}
