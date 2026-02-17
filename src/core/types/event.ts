/**
 * Core event model types for Last9 Change Events API
 */

/**
 * Event state representing the lifecycle stage
 */
export type EventState = 'start' | 'stop';

/**
 * Attribute value types supported by Last9 API
 */
export type AttributeValue = string | number | boolean;

/**
 * Attributes map for event metadata
 */
export type Attributes = Record<string, AttributeValue>;

/**
 * Change event payload sent to Last9 API
 */
export interface ChangeEvent {
  /** Custom event identifier (becomes a label) */
  event_name: string;

  /** Event lifecycle state */
  event_state: EventState;

  /** ISO8601 timestamp (optional, defaults to server time) */
  timestamp?: string;

  /** Target Last9 cluster name */
  data_source_name?: string;

  /** Key-value pairs converted to metric labels */
  attributes: Attributes;
}

/**
 * Response from Last9 API after sending event
 */
export interface ChangeEventResponse {
  /** Whether the event was successfully recorded */
  success: boolean;

  /** Server-generated event ID */
  event_id?: string;

  /** Server timestamp of when event was recorded */
  timestamp?: string;

  /** Error message if success is false */
  error?: string;
}

/**
 * Result of deployment marker action execution
 */
export interface DeploymentMarkerResult {
  /** Overall success status */
  success: boolean;

  /** ISO timestamp of start event (if sent) */
  startTimestamp?: string;

  /** ISO timestamp of stop event (if sent) */
  stopTimestamp?: string;

  /** Number of events successfully sent */
  eventsSent: number;

  /** Number of events that failed */
  eventsFailed: number;

  /** Total execution duration in milliseconds */
  durationMs: number;

  /** Number of retry attempts made */
  retryCount: number;

  /** Error if execution failed */
  error?: Error;
}

/**
 * Validation result from event or config validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation error messages */
  errors: string[];

  /** Warnings (non-blocking) */
  warnings: string[];
}
