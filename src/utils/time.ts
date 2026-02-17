/**
 * Time utilities
 */

/**
 * Get current timestamp in ISO8601 format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if timestamp is in the past
 * @param timestamp - ISO8601 timestamp or Unix timestamp (seconds)
 * @param bufferSeconds - Buffer time in seconds
 */
export function isExpired(timestamp: number | string, bufferSeconds = 0): boolean {
  const expiryTime = typeof timestamp === 'string'
    ? new Date(timestamp).getTime()
    : timestamp * 1000; // Convert seconds to milliseconds

  const now = Date.now();
  const buffer = bufferSeconds * 1000;

  return (expiryTime - buffer) <= now;
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff with jitter
 * @param attemptNumber - Current attempt number (0-indexed)
 * @param baseMs - Base backoff in milliseconds
 * @param maxMs - Maximum backoff in milliseconds
 * @returns Backoff time in milliseconds
 */
export function calculateBackoff(
  attemptNumber: number,
  baseMs: number,
  maxMs: number
): number {
  const exponential = Math.pow(2, attemptNumber) * baseMs;
  const jitter = Math.random() * 0.3 * exponential; // 30% jitter
  return Math.min(exponential + jitter, maxMs);
}

/**
 * Create a timer for measuring duration
 */
export function createTimer(): {
  start: Date;
  elapsed: () => number;
  elapsedMs: () => number;
} {
  const start = new Date();

  return {
    start,
    elapsed(): number {
      return Date.now() - start.getTime();
    },
    elapsedMs(): number {
      return this.elapsed();
    }
  };
}
