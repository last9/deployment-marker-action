/**
 * Simple retry wrapper with exponential backoff
 */

import { isRetryableError } from './utils/errors';
import { sleep, calculateBackoff } from './utils/time';
import { getLogger } from './utils/logger';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  maxBackoffMs: number;
}

/**
 * Execute operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  operationName = 'operation'
): Promise<T> {
  const logger = getLogger();
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      // Execute the operation
      const result = await operation();

      if (attempt > 0) {
        logger.info(`${operationName} succeeded after ${attempt} retries`);
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Don't retry if this is the last attempt
      if (attempt === config.maxAttempts - 1) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        logger.debug(`${operationName} failed with non-retryable error`, {
          error: lastError.message
        });
        throw error;
      }

      // Calculate backoff and wait
      const backoffTime = calculateBackoff(
        attempt,
        config.backoffMs,
        config.maxBackoffMs
      );

      logger.warning(`${operationName} failed, retrying in ${backoffTime}ms`, {
        attempt: attempt + 1,
        maxAttempts: config.maxAttempts,
        error: lastError.message
      });

      await sleep(backoffTime);
    }
  }

  // All retries exhausted
  logger.error(`${operationName} failed after ${config.maxAttempts} attempts`, lastError);
  throw lastError;
}
