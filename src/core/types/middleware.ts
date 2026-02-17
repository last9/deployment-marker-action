/**
 * Middleware system for request/response pipeline
 */

import type { ChangeEvent, ChangeEventResponse } from './event';

/**
 * Middleware execution phase
 */
export type MiddlewarePhase = 'pre' | 'post' | 'error';

/**
 * HTTP request representation
 */
export interface ApiRequest {
  /** Request URL */
  url: string;

  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';

  /** Request headers */
  headers: Record<string, string>;

  /** Request body */
  body?: unknown;

  /** Request metadata */
  metadata: Record<string, unknown>;
}

/**
 * HTTP response representation
 */
export interface ApiResponse {
  /** HTTP status code */
  statusCode: number;

  /** Response headers */
  headers: Record<string, string>;

  /** Response body */
  body?: unknown;

  /** Response metadata */
  metadata: Record<string, unknown>;
}

/**
 * Context passed through middleware pipeline
 */
export interface MiddlewareContext {
  /** Current request (if in request phase) */
  request?: ApiRequest;

  /** Current response (if in response phase) */
  response?: ApiResponse;

  /** Error (if in error phase) */
  error?: Error;

  /** Event being processed */
  event?: ChangeEvent;

  /** Event response (if successful) */
  eventResponse?: ChangeEventResponse;

  /** Shared metadata between middleware */
  metadata: Map<string, unknown>;

  /**
   * Set metadata value
   * @param key - Metadata key
   * @param value - Metadata value
   */
  set(key: string, value: unknown): void;

  /**
   * Get metadata value
   * @param key - Metadata key
   * @returns Metadata value or undefined
   */
  get<T>(key: string): T | undefined;

  /**
   * Check if metadata key exists
   * @param key - Metadata key
   * @returns True if key exists
   */
  has(key: string): boolean;
}

/**
 * Middleware next function
 */
export type MiddlewareNext = () => Promise<void>;

/**
 * Middleware interface
 */
export interface Middleware {
  /** Unique middleware identifier */
  readonly name: string;

  /** Execution phase */
  readonly phase: MiddlewarePhase;

  /** Execution priority (higher = earlier) */
  readonly priority: number;

  /**
   * Execute middleware logic
   * @param context - Middleware context
   * @param next - Call to continue pipeline
   */
  execute(context: MiddlewareContext, next: MiddlewareNext): Promise<void>;
}

/**
 * Middleware factory function
 */
export type MiddlewareFactory = (config?: Record<string, unknown>) => Middleware;
