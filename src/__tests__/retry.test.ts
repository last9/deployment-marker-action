/**
 * Tests for retry logic
 */

import { withRetry } from '../retry';
import { NetworkError, ConfigError } from '../utils/errors';

describe('withRetry', () => {
  it('should return result on first attempt if successful', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await withRetry(
      operation,
      { maxAttempts: 3, backoffMs: 100, maxBackoffMs: 1000 },
      'test-operation'
    );

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new NetworkError('Timeout'))
      .mockRejectedValueOnce(new NetworkError('Connection reset'))
      .mockResolvedValue('success');

    const result = await withRetry(
      operation,
      { maxAttempts: 3, backoffMs: 10, maxBackoffMs: 100 },
      'test-operation'
    );

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const operation = jest.fn().mockRejectedValue(new ConfigError('Invalid config'));

    await expect(
      withRetry(
        operation,
        { maxAttempts: 3, backoffMs: 10, maxBackoffMs: 100 },
        'test-operation'
      )
    ).rejects.toThrow(ConfigError);

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should throw error after max attempts', async () => {
    const error = new NetworkError('Persistent failure');
    const operation = jest.fn().mockRejectedValue(error);

    await expect(
      withRetry(
        operation,
        { maxAttempts: 3, backoffMs: 10, maxBackoffMs: 100 },
        'test-operation'
      )
    ).rejects.toThrow(NetworkError);

    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should wait with exponential backoff between retries', async () => {
    const startTime = Date.now();
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new NetworkError('Fail 1'))
      .mockRejectedValueOnce(new NetworkError('Fail 2'))
      .mockResolvedValue('success');

    await withRetry(
      operation,
      { maxAttempts: 3, backoffMs: 50, maxBackoffMs: 500 },
      'test-operation'
    );

    const elapsed = Date.now() - startTime;

    // Should wait at least 50ms + 100ms = 150ms
    // (with jitter it might be a bit more)
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});
