/**
 * Tests for error classes
 */

import {
  Last9Error,
  ConfigError,
  TokenExchangeError,
  NetworkError,
  ApiError,
  RateLimitError,
  isLast9Error,
  isRetryableError,
  wrapError
} from '../errors';

describe('Error Classes', () => {
  describe('ConfigError', () => {
    it('should create config error with correct properties', () => {
      const error = new ConfigError('Invalid configuration', { field: 'apiKey' });

      expect(error).toBeInstanceOf(Last9Error);
      expect(error).toBeInstanceOf(ConfigError);
      expect(error.message).toBe('Invalid configuration');
      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.retryable).toBe(false);
      expect(error.context).toEqual({ field: 'apiKey' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should have proper error name', () => {
      const error = new ConfigError('Test');
      expect(error.name).toBe('ConfigError');
    });
  });

  describe('TokenExchangeError', () => {
    it('should create token error with status code', () => {
      const error = new TokenExchangeError('Invalid token', 401);

      expect(error.code).toBe('TOKEN_EXCHANGE_ERROR');
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(401);
    });
  });

  describe('NetworkError', () => {
    it('should be retryable', () => {
      const error = new NetworkError('Connection failed');

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
    });
  });

  describe('ApiError', () => {
    it('should be retryable for 5xx status codes', () => {
      const error = new ApiError('Server error', 500);

      expect(error.code).toBe('API_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(500);
    });

    it('should be retryable for 429 status code', () => {
      const error = new ApiError('Rate limited', 429);

      expect(error.retryable).toBe(true);
    });

    it('should not be retryable for 4xx status codes (except 429)', () => {
      const error = new ApiError('Bad request', 400);

      expect(error.retryable).toBe(false);
    });
  });

  describe('RateLimitError', () => {
    it('should store retry after duration', () => {
      const error = new RateLimitError('Rate limited', 5000);

      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(429);
      expect(error.retryAfterMs).toBe(5000);
    });
  });

  describe('isLast9Error', () => {
    it('should return true for Last9Error instances', () => {
      const error = new ConfigError('Test');
      expect(isLast9Error(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Test');
      expect(isLast9Error(error)).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isLast9Error('string')).toBe(false);
      expect(isLast9Error(null)).toBe(false);
      expect(isLast9Error(undefined)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable errors', () => {
      const error = new NetworkError('Timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = new ConfigError('Invalid');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for non-Last9 errors', () => {
      const error = new Error('Generic');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('wrapError', () => {
    it('should return Last9Error as-is', () => {
      const original = new ConfigError('Test');
      const wrapped = wrapError(original);

      expect(wrapped).toBe(original);
    });

    it('should wrap regular Error', () => {
      const original = new Error('Something failed');
      const wrapped = wrapError(original);

      expect(wrapped).toBeInstanceOf(Last9Error);
      expect(wrapped.message).toBe('Something failed');
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
    });

    it('should use default message if error has no message', () => {
      const original = new Error();
      const wrapped = wrapError(original, 'Default message');

      expect(wrapped.message).toBe('Default message');
    });

    it('should wrap non-Error values', () => {
      const wrapped = wrapError('string error');

      expect(wrapped).toBeInstanceOf(Last9Error);
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new ApiError('Test error', 500, { requestId: '123' });
      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'ApiError',
        code: 'API_ERROR',
        message: 'Test error',
        retryable: true,
        statusCode: 500,
        context: { requestId: '123' }
      });
      expect(json['timestamp']).toBeDefined();
      expect(json['stack']).toBeDefined();
    });
  });
});
