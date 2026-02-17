/**
 * Custom error classes for precise error handling
 */

/**
 * Error codes for categorization
 */
export enum ErrorCode {
  // Configuration errors (user mistakes)
  CONFIG_ERROR = 'CONFIG_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Authentication errors
  TOKEN_EXCHANGE_ERROR = 'TOKEN_EXCHANGE_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // Network errors (transient)
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // API errors
  API_ERROR = 'API_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',

  // Plugin errors
  PLUGIN_ERROR = 'PLUGIN_ERROR',
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',
  PLUGIN_INIT_ERROR = 'PLUGIN_INIT_ERROR',

  // Circuit breaker
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Base error class for all Last9 action errors
 */
export abstract class Last9Error extends Error {
  /**
   * Error code for categorization
   */
  abstract readonly code: ErrorCode;

  /**
   * Whether error is retryable
   */
  abstract readonly retryable: boolean;

  /**
   * HTTP status code if applicable
   */
  readonly statusCode?: number;

  /**
   * Additional error context
   */
  readonly context?: Record<string, unknown>;

  /**
   * Timestamp when error occurred
   */
  readonly timestamp: Date;

  constructor(message: string, statusCode?: number, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date();

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

/**
 * Configuration error (user mistake, fail fast)
 */
export class ConfigError extends Last9Error {
  readonly code = ErrorCode.CONFIG_ERROR;
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, undefined, context);
  }
}

/**
 * Invalid input error (validation failure)
 */
export class InvalidInputError extends Last9Error {
  readonly code = ErrorCode.INVALID_INPUT;
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, undefined, context);
  }
}

/**
 * Validation error (schema validation failure)
 */
export class ValidationError extends Last9Error {
  readonly code = ErrorCode.VALIDATION_ERROR;
  readonly retryable = false;

  constructor(message: string, errors: string[], context?: Record<string, unknown>) {
    super(message, undefined, { ...context, validationErrors: errors });
  }
}

/**
 * Token exchange error (bad refresh token)
 */
export class TokenExchangeError extends Last9Error {
  readonly code = ErrorCode.TOKEN_EXCHANGE_ERROR;
  readonly retryable = false;

  constructor(message: string, statusCode?: number, context?: Record<string, unknown>) {
    super(message, statusCode, context);
  }
}

/**
 * Token expired error (needs refresh)
 */
export class TokenExpiredError extends Last9Error {
  readonly code = ErrorCode.TOKEN_EXPIRED;
  readonly retryable = true;

  constructor(message = 'Access token expired', context?: Record<string, unknown>) {
    super(message, 401, context);
  }
}

/**
 * Unauthorized error (invalid credentials)
 */
export class UnauthorizedError extends Last9Error {
  readonly code = ErrorCode.UNAUTHORIZED;
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 401, context);
  }
}

/**
 * Network error (connection issues, retry)
 */
export class NetworkError extends Last9Error {
  readonly code = ErrorCode.NETWORK_ERROR;
  readonly retryable = true;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, undefined, context);
  }
}

/**
 * Timeout error (request took too long, retry)
 */
export class TimeoutError extends Last9Error {
  readonly code = ErrorCode.TIMEOUT_ERROR;
  readonly retryable = true;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 408, context);
  }
}

/**
 * Connection error (cannot reach server, retry)
 */
export class ConnectionError extends Last9Error {
  readonly code = ErrorCode.CONNECTION_ERROR;
  readonly retryable = true;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, undefined, context);
  }
}

/**
 * API error (Last9 API returned error)
 */
export class ApiError extends Last9Error {
  readonly code = ErrorCode.API_ERROR;
  readonly retryable: boolean;

  constructor(message: string, statusCode: number, context?: Record<string, unknown>) {
    super(message, statusCode, context);

    // 5xx errors and 429 are retryable
    this.retryable = statusCode >= 500 || statusCode === 429;
  }
}

/**
 * Rate limit error (429 from API, retry with backoff)
 */
export class RateLimitError extends Last9Error {
  readonly code = ErrorCode.RATE_LIMIT_ERROR;
  readonly retryable = true;

  readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number, context?: Record<string, unknown>) {
    super(message, 429, { ...context, retryAfterMs });
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Server error (5xx from API, retry)
 */
export class ServerError extends Last9Error {
  readonly code = ErrorCode.SERVER_ERROR;
  readonly retryable = true;

  constructor(message: string, statusCode: number, context?: Record<string, unknown>) {
    super(message, statusCode, context);
  }
}

/**
 * Plugin error (plugin execution failure)
 */
export class PluginError extends Last9Error {
  readonly code = ErrorCode.PLUGIN_ERROR;
  readonly retryable = false;

  readonly pluginName: string;

  constructor(
    pluginName: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, undefined, { ...context, pluginName });
    this.pluginName = pluginName;
  }
}

/**
 * Plugin not found error
 */
export class PluginNotFoundError extends Last9Error {
  readonly code = ErrorCode.PLUGIN_NOT_FOUND;
  readonly retryable = false;

  constructor(pluginName: string) {
    super(`Plugin not found: ${pluginName}`, undefined, { pluginName });
  }
}

/**
 * Plugin initialization error
 */
export class PluginInitError extends Last9Error {
  readonly code = ErrorCode.PLUGIN_INIT_ERROR;
  readonly retryable = false;

  constructor(
    pluginName: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, undefined, { ...context, pluginName });
  }
}

/**
 * Circuit breaker open error (too many failures)
 */
export class CircuitBreakerOpenError extends Last9Error {
  readonly code = ErrorCode.CIRCUIT_BREAKER_OPEN;
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, undefined, context);
  }
}

/**
 * Unknown error (unexpected failure)
 */
export class UnknownError extends Last9Error {
  readonly code = ErrorCode.UNKNOWN_ERROR;
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, undefined, context);
  }
}

/**
 * Type guard to check if error is Last9Error
 */
export function isLast9Error(error: unknown): error is Last9Error {
  return error instanceof Last9Error;
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return isLast9Error(error) && error.retryable;
}

/**
 * Wrap unknown error into Last9Error
 */
export function wrapError(error: unknown, defaultMessage?: string): Last9Error {
  if (isLast9Error(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new UnknownError(error.message || defaultMessage || 'Unknown error occurred', {
      originalError: error.name,
      stack: error.stack
    });
  }

  return new UnknownError(
    defaultMessage || 'Unknown error occurred',
    { originalError: String(error) }
  );
}
