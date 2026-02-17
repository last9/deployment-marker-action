/**
 * Tests for time utilities
 */

import {
  getCurrentTimestamp,
  isExpired,
  sleep,
  calculateBackoff,
  createTimer
} from '../time';

describe('Time Utilities', () => {
  describe('getCurrentTimestamp', () => {
    it('should return ISO8601 timestamp', () => {
      const timestamp = getCurrentTimestamp();

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(() => new Date(timestamp)).not.toThrow();
    });

    it('should return current time', () => {
      const before = Date.now();
      const timestamp = getCurrentTimestamp();
      const after = Date.now();

      const time = new Date(timestamp).getTime();
      expect(time).toBeGreaterThanOrEqual(before);
      expect(time).toBeLessThanOrEqual(after);
    });
  });

  describe('isExpired', () => {
    it('should return true for past Unix timestamp', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      expect(isExpired(pastTimestamp)).toBe(true);
    });

    it('should return false for future Unix timestamp', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      expect(isExpired(futureTimestamp)).toBe(false);
    });

    it('should return true for past ISO8601 timestamp', () => {
      const past = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      expect(isExpired(past)).toBe(true);
    });

    it('should return false for future ISO8601 timestamp', () => {
      const future = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      expect(isExpired(future)).toBe(false);
    });

    it('should account for buffer seconds', () => {
      const nearFuture = Math.floor(Date.now() / 1000) + 60; // 1 minute from now

      expect(isExpired(nearFuture, 0)).toBe(false);
      expect(isExpired(nearFuture, 120)).toBe(true); // 2 minute buffer
    });
  });

  describe('sleep', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow 10ms tolerance
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      const baseMs = 1000;
      const maxMs = 30000;

      const backoff0 = calculateBackoff(0, baseMs, maxMs);
      const backoff1 = calculateBackoff(1, baseMs, maxMs);
      const backoff2 = calculateBackoff(2, baseMs, maxMs);

      // Each backoff should be roughly double the previous (with jitter)
      expect(backoff0).toBeGreaterThan(900);
      expect(backoff0).toBeLessThan(1500);

      expect(backoff1).toBeGreaterThan(1800);
      expect(backoff1).toBeLessThan(3000);

      expect(backoff2).toBeGreaterThan(3600);
      expect(backoff2).toBeLessThan(6000);
    });

    it('should not exceed maximum backoff', () => {
      const baseMs = 1000;
      const maxMs = 5000;

      const backoff10 = calculateBackoff(10, baseMs, maxMs);

      expect(backoff10).toBeLessThanOrEqual(maxMs);
    });

    it('should include jitter', () => {
      const baseMs = 1000;
      const maxMs = 30000;

      // Generate multiple backoffs for same attempt
      const backoffs = Array.from({ length: 10 }, () =>
        calculateBackoff(1, baseMs, maxMs)
      );

      // All should be different due to jitter
      const uniqueBackoffs = new Set(backoffs);
      expect(uniqueBackoffs.size).toBeGreaterThan(1);
    });
  });

  describe('createTimer', () => {
    it('should create timer with start time', () => {
      const timer = createTimer();

      expect(timer.start).toBeInstanceOf(Date);
    });

    it('should measure elapsed time', async () => {
      const timer = createTimer();

      await sleep(100);

      const elapsed = timer.elapsed();
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });

    it('should have elapsedMs alias', async () => {
      const timer = createTimer();

      await sleep(50);

      expect(timer.elapsedMs()).toBe(timer.elapsed());
    });

    it('should continue measuring elapsed time', async () => {
      const timer = createTimer();

      await sleep(50);
      const elapsed1 = timer.elapsed();

      await sleep(50);
      const elapsed2 = timer.elapsed();

      expect(elapsed2).toBeGreaterThan(elapsed1);
    });
  });
});
