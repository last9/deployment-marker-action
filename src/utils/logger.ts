/**
 * Structured logging utility
 */

import * as core from '@actions/core';
import { isLast9Error } from './errors';

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * Sensitive data patterns to redact
 */
const SENSITIVE_KEYS = [
  'token',
  'password',
  'secret',
  'authorization',
  'api_key',
  'apikey',
  'refresh_token',
  'access_token',
  'bearer'
];

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warning(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
  startGroup(name: string): void;
  endGroup(): void;
}

/**
 * Action logger implementation using @actions/core
 */
export class ActionLogger implements ILogger {
  constructor(private readonly logLevel: LogLevel = LogLevel.INFO) {}

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
      core.debug(this.formatMessage(entry));
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, message, context);
      core.info(this.formatMessage(entry));
    }
  }

  /**
   * Log warning message
   */
  warning(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARNING)) {
      const entry = this.createLogEntry(LogLevel.WARNING, message, context);
      core.warning(this.formatMessage(entry));
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
      core.error(this.formatMessage(entry));
    }
  }

  /**
   * Start log group (collapsible section)
   */
  startGroup(name: string): void {
    core.startGroup(name);
  }

  /**
   * End log group
   */
  endGroup(): void {
    core.endGroup();
  }

  /**
   * Check if message should be logged based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString()
    };

    if (context) {
      entry.context = this.redactSensitiveData(context) as Record<string, unknown>;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };

      // Add error code if Last9Error
      if (isLast9Error(error)) {
        entry.error.code = error.code;
      }
    }

    return entry;
  }

  /**
   * Format log entry as string
   */
  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [entry.message];

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    if (entry.error) {
      parts.push(`[${entry.error.name}: ${entry.error.message}]`);
      if (entry.error.code) {
        parts.push(`(${entry.error.code})`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Redact sensitive data from object
   */
  private redactSensitiveData(data: unknown): unknown {
    if (typeof data === 'string') {
      return this.redactSensitiveString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.redactSensitiveData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const redacted: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveKey(key)) {
          redacted[key] = '[REDACTED]';
        } else if (typeof value === 'object' || Array.isArray(value)) {
          redacted[key] = this.redactSensitiveData(value);
        } else if (typeof value === 'string') {
          redacted[key] = this.redactSensitiveString(value);
        } else {
          redacted[key] = value;
        }
      }

      return redacted;
    }

    return data;
  }

  /**
   * Redact bearer tokens and sensitive patterns from strings
   */
  private redactSensitiveString(str: string): string {
    // Redact Bearer tokens
    return str.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
  }

  /**
   * Check if key name indicates sensitive data
   */
  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive));
  }
}

/**
 * Create default logger instance
 */
export function createLogger(level: LogLevel = LogLevel.INFO): ILogger {
  return new ActionLogger(level);
}

/**
 * Global logger instance
 */
let globalLogger: ILogger | undefined;

/**
 * Get or create global logger
 */
export function getLogger(): ILogger {
  if (!globalLogger) {
    globalLogger = createLogger();
  }
  return globalLogger;
}

/**
 * Set global logger instance
 */
export function setLogger(logger: ILogger): void {
  globalLogger = logger;
}
