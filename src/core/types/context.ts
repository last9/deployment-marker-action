/**
 * Action execution context types
 */

/**
 * GitHub repository information
 */
export interface RepositoryInfo {
  owner: string;
  repo: string;
  fullName: string;
}

/**
 * GitHub workflow information
 */
export interface WorkflowInfo {
  name: string;
  runId: number;
  runNumber: number;
  runAttempt: number;
}

/**
 * Git commit information
 */
export interface CommitInfo {
  sha: string;
  ref: string;
  message: string;
  branch?: string;
}

/**
 * Actor (user) information
 */
export interface ActorInfo {
  username: string;
  email?: string;
}

/**
 * GitHub event information
 */
export interface EventInfo {
  name: string;
  type: string;
  payload: Record<string, unknown>;
}

/**
 * Action execution context
 *
 * Provides access to GitHub Actions environment,
 * workflow metadata, and execution state.
 */
export interface ActionContext {
  /** Repository information */
  repository: RepositoryInfo;

  /** Workflow execution information */
  workflow: WorkflowInfo;

  /** Git commit information */
  commit: CommitInfo;

  /** Actor who triggered the workflow */
  actor: ActorInfo;

  /** GitHub event that triggered workflow */
  event: EventInfo;

  /** Correlation ID for tracing */
  correlationId: string;

  /** Action start timestamp */
  startTime: Date;

  /** Environment variables */
  env: Record<string, string>;
}

/**
 * Action configuration
 */
export interface ActionConfig {
  /** Configuration schema version */
  version: string;

  /** API configuration */
  api: ApiConfig;

  /** Event configuration */
  events: EventConfig;

  /** Attributes configuration */
  attributes: AttributesConfig;

  /** Retry configuration */
  retry: RetryConfig;

  /** Telemetry configuration */
  telemetry: TelemetryConfig;

  /** Plugin configuration */
  plugins: PluginsConfig;
}

/**
 * API configuration
 */
export interface ApiConfig {
  /** Last9 API base URL */
  baseUrl: string;

  /** Organization slug */
  orgSlug: string;

  /** Refresh token for authentication */
  refreshToken: string;

  /** Optional data source (cluster) name */
  dataSourceName?: string;

  /** Request timeout in milliseconds */
  timeoutMs: number;
}

/**
 * Event configuration
 */
export interface EventConfig {
  /** Whether to send start event */
  sendStart: boolean;

  /** Whether to send stop event */
  sendStop: boolean;

  /** Event name */
  eventName: string;

  /** Event type (for plugin selection) */
  eventType: string;
}

/**
 * Attributes configuration
 */
export interface AttributesConfig {
  /** Auto-attribute collection settings */
  auto: {
    github: boolean;
    git: boolean;
    environment: boolean;
  };

  /** Custom user-defined attributes */
  custom: Record<string, string | number | boolean>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;

  /** Initial backoff in milliseconds */
  backoffMs: number;

  /** Maximum backoff in milliseconds */
  maxBackoffMs: number;

  /** Status codes that should trigger retry */
  retryableStatusCodes: number[];
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Whether telemetry is enabled */
  enabled: boolean;

  /** Whether to send action metrics to Last9 */
  sendToLast9: boolean;

  /** Whether to include error details in telemetry */
  includeErrors: boolean;
}

/**
 * Plugins configuration
 */
export interface PluginsConfig {
  /** List of enabled plugin names */
  enabled: string[];

  /** Plugin-specific configuration */
  config: Record<string, Record<string, unknown>>;
}
