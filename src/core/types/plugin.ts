/**
 * Plugin system interfaces for extensibility
 */

import type { ChangeEvent, Attributes, ValidationResult } from './event';
import type { ActionContext } from './context';

/**
 * Base plugin configuration
 */
export interface PluginConfig {
  /** Whether plugin is enabled */
  enabled: boolean;

  /** Plugin-specific configuration */
  [key: string]: unknown;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /** Unique plugin identifier */
  name: string;

  /** Semantic version */
  version: string;

  /** Human-readable description */
  description: string;

  /** Plugin author */
  author?: string;
}

/**
 * Base interface for all plugins
 */
export interface Plugin {
  /** Plugin metadata */
  readonly metadata: PluginMetadata;

  /**
   * Initialize plugin with configuration and context
   * Called once during action setup
   */
  initialize(config: PluginConfig, context: ActionContext): Promise<void>;

  /**
   * Cleanup resources before action completes
   * Called once at action teardown
   */
  dispose(): Promise<void>;
}

/**
 * Event plugin for generating change events
 */
export interface EventPlugin extends Plugin {
  /** Event types this plugin supports */
  readonly supportedEventTypes: string[];

  /**
   * Create a change event from inputs
   * @param eventType - Type of event to create
   * @param state - Event lifecycle state
   * @param attributes - Base attributes to include
   * @returns Generated change event
   */
  createEvent(
    eventType: string,
    state: 'start' | 'stop',
    attributes: Attributes
  ): Promise<ChangeEvent>;

  /**
   * Validate event before sending
   * @param event - Event to validate
   * @returns Validation result
   */
  validate(event: ChangeEvent): ValidationResult;

  /**
   * Check if plugin should handle this event type
   * @param eventType - Type to check
   * @returns True if plugin handles this type
   */
  canHandle(eventType: string): boolean;
}

/**
 * Attribute provider for auto-collecting metadata
 */
export interface AttributeProvider extends Plugin {
  /**
   * Priority for provider execution (higher = earlier)
   * Used to order attribute collection
   */
  readonly priority: number;

  /**
   * Provide attributes for an event
   * @param context - Action execution context
   * @param eventType - Type of event being created
   * @returns Attributes to merge into event
   */
  provideAttributes(context: ActionContext, eventType: string): Promise<Attributes>;

  /**
   * Check if provider should run for this event type
   * @param eventType - Type to check
   * @returns True if provider should contribute attributes
   */
  shouldProvide(eventType: string): boolean;
}

/**
 * Output handler for action results
 */
export interface OutputHandler extends Plugin {
  /**
   * Handle successful event send
   * @param event - Event that was sent
   * @param response - API response
   */
  onEventSent(event: ChangeEvent, response: { timestamp: string }): Promise<void>;

  /**
   * Handle event send failure
   * @param event - Event that failed
   * @param error - Error that occurred
   */
  onEventFailed(event: ChangeEvent, error: Error): Promise<void>;

  /**
   * Handle action completion
   * @param result - Final action result
   */
  onComplete(result: {
    success: boolean;
    startTimestamp?: string;
    stopTimestamp?: string;
  }): Promise<void>;
}

/**
 * Telemetry plugin for observability
 */
export interface TelemetryPlugin extends Plugin {
  /**
   * Record action start
   * @param context - Action context
   */
  onActionStart(context: ActionContext): Promise<void>;

  /**
   * Record event being sent
   * @param event - Event about to be sent
   */
  onEventSending(event: ChangeEvent): Promise<void>;

  /**
   * Record successful event send
   * @param event - Event that was sent
   * @param durationMs - Time taken in milliseconds
   */
  onEventSent(event: ChangeEvent, durationMs: number): Promise<void>;

  /**
   * Record event send failure
   * @param event - Event that failed
   * @param error - Error that occurred
   */
  onEventFailed(event: ChangeEvent, error: Error): Promise<void>;

  /**
   * Record retry attempt
   * @param operation - Operation being retried
   * @param attemptNumber - Retry attempt number
   */
  onRetry(operation: string, attemptNumber: number): Promise<void>;

  /**
   * Record action completion
   * @param result - Final result with metrics
   */
  onActionComplete(result: {
    success: boolean;
    durationMs: number;
    eventsSent: number;
    eventsFailed: number;
    retryCount: number;
  }): Promise<void>;
}
