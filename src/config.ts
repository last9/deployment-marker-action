/**
 * Simple configuration loading from GitHub Action inputs
 */

import type { ContextProvider } from './core/types/provider';
import { InvalidInputError, ConfigError } from './utils/errors';
import { getLogger } from './utils/logger';

/**
 * Action configuration
 */
export interface ActionConfig {
  // API configuration
  apiBaseUrl: string;
  orgSlug: string;
  refreshToken: string;
  dataSourceName?: string;

  // Event configuration
  eventName: string;
  eventState: 'start' | 'stop' | 'both';

  // Attributes configuration
  includeGitHubAttributes: boolean;
  customAttributes: Record<string, string | number | boolean>;

  // Retry configuration
  maxRetryAttempts: number;
  retryBackoffMs: number;
  maxRetryBackoffMs: number;
}

/**
 * Load configuration from GitHub Action inputs
 */
export function loadConfig(context: ContextProvider): ActionConfig {
  const logger = getLogger();

  logger.startGroup('Loading configuration');

  try {
    // Required inputs
    const refreshToken = context.getInput('refresh_token', true);
    const orgSlug = context.getInput('org_slug', true);

    // Mark token as secret
    context.setSecret(refreshToken);

    // Optional inputs with defaults
    const apiBaseUrl = context.getInput('api_base_url') || 'https://app.last9.io';
    const eventName = context.getInput('event_name') || 'deployment';
    const eventState = parseEventState(context.getInput('event_state') || 'stop');
    const dataSourceName = context.getInput('data_source_name') || undefined;

    // Attributes
    const includeGitHubAttributes = parseBoolean(
      context.getInput('include_github_attributes') || 'true'
    );
    const customAttributes = parseCustomAttributes(
      context.getInput('custom_attributes')
    );

    // Retry configuration
    const maxRetryAttempts = parseInt(context.getInput('max_retry_attempts') || '3', 10);
    const retryBackoffMs = parseInt(context.getInput('retry_backoff_ms') || '1000', 10);
    const maxRetryBackoffMs = parseInt(
      context.getInput('max_retry_backoff_ms') || '30000',
      10
    );

    const config: ActionConfig = {
      apiBaseUrl,
      orgSlug,
      refreshToken,
      dataSourceName,
      eventName,
      eventState,
      includeGitHubAttributes,
      customAttributes,
      maxRetryAttempts,
      retryBackoffMs,
      maxRetryBackoffMs
    };

    logger.info('Configuration loaded successfully', {
      orgSlug,
      eventName,
      eventState,
      includeGitHubAttributes,
      customAttributeCount: Object.keys(customAttributes).length
    });

    return config;
  } finally {
    logger.endGroup();
  }
}

/**
 * Parse event state input
 */
function parseEventState(value: string): 'start' | 'stop' | 'both' {
  const normalized = value.toLowerCase().trim();

  if (normalized === 'start' || normalized === 'stop' || normalized === 'both') {
    return normalized;
  }

  throw new InvalidInputError(
    `Invalid event_state: ${value}. Must be 'start', 'stop', or 'both'`
  );
}

/**
 * Parse boolean input
 */
function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Parse custom attributes JSON input
 */
function parseCustomAttributes(value: string): Record<string, string | number | boolean> {
  if (!value || value.trim() === '') {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new ConfigError('custom_attributes must be a JSON object');
    }

    // Validate attribute values
    for (const [key, val] of Object.entries(parsed)) {
      const valType = typeof val;
      if (valType !== 'string' && valType !== 'number' && valType !== 'boolean') {
        throw new ConfigError(
          `Invalid attribute value for '${key}': must be string, number, or boolean`
        );
      }
    }

    return parsed as Record<string, string | number | boolean>;
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }

    throw new ConfigError(
      `Failed to parse custom_attributes as JSON: ${(error as Error).message}`
    );
  }
}
