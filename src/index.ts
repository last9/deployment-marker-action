/**
 * Main entry point for Last9 Deployment Marker GitHub Action
 */

import * as core from '@actions/core';
import { GitHubContextProvider } from './providers/context/github-context';
import { Last9ApiClient } from './providers/api/last9-client';
import { TokenManager } from './providers/api/token-manager';
import { loadConfig } from './config';
import { collectAttributes } from './attribute-collector';
import { createDeploymentEvent } from './event-builder';
import { withRetry } from './retry';
import { getLogger, setLogger, createLogger, LogLevel } from './utils/logger';
import { isLast9Error, wrapError } from './utils/errors';
import { createTimer } from './utils/time';

/**
 * Main action execution
 */
async function run(): Promise<void> {
  // Initialize logger
  const logLevel = process.env['RUNNER_DEBUG'] === '1' ? LogLevel.DEBUG : LogLevel.INFO;
  setLogger(createLogger(logLevel));
  const logger = getLogger();

  const timer = createTimer();

  try {
    logger.startGroup('🚀 Last9 Deployment Marker Action');
    logger.info('Action started', {
      version: process.env['GITHUB_ACTION_VERSION'] || '1.0.0',
      node: process.version
    });

    // Load configuration
    const context = new GitHubContextProvider();
    const config = loadConfig(context);

    // Initialize API client and token manager
    const apiClient = new Last9ApiClient({
      baseUrl: config.apiBaseUrl,
      timeoutMs: 30000
    });

    const tokenManager = new TokenManager(apiClient, {
      expiryBufferSeconds: 300 // 5 minutes
    });

    // Collect attributes
    const attributes = collectAttributes(context, {
      includeGitHub: config.includeGitHubAttributes,
      customAttributes: config.customAttributes,
      serviceName: config.serviceName,
      env: config.env
    });

    // Track results
    let startTimestamp: string | undefined;
    let stopTimestamp: string | undefined;

    // Get access token
    logger.info('Exchanging refresh token for access token');
    const accessToken = await withRetry(
      () => tokenManager.getAccessToken(config.refreshToken),
      {
        maxAttempts: config.maxRetryAttempts,
        backoffMs: config.retryBackoffMs,
        maxBackoffMs: config.maxRetryBackoffMs
      },
      'Token exchange'
    );

    // Send start event if needed
    if (config.eventState === 'start' || config.eventState === 'both') {
      logger.info('Sending start event');

      const startEvent = createDeploymentEvent('start', attributes, {
        eventName: config.eventName,
        dataSourceName: config.dataSourceName
      });

      const response = await withRetry(
        () => apiClient.sendChangeEvent(config.orgSlug, startEvent, accessToken),
        {
          maxAttempts: config.maxRetryAttempts,
          backoffMs: config.retryBackoffMs,
          maxBackoffMs: config.maxRetryBackoffMs
        },
        'Send start event'
      );

      startTimestamp = response.timestamp || startEvent.timestamp;
      logger.info('✓ Start event sent successfully', {
        timestamp: startTimestamp,
        eventId: response.event_id
      });
    }

    // Send stop event if needed
    if (config.eventState === 'stop' || config.eventState === 'both') {
      logger.info('Sending stop event');

      const stopEvent = createDeploymentEvent('stop', attributes, {
        eventName: config.eventName,
        dataSourceName: config.dataSourceName
      });

      const response = await withRetry(
        () => apiClient.sendChangeEvent(config.orgSlug, stopEvent, accessToken),
        {
          maxAttempts: config.maxRetryAttempts,
          backoffMs: config.retryBackoffMs,
          maxBackoffMs: config.maxRetryBackoffMs
        },
        'Send stop event'
      );

      stopTimestamp = response.timestamp || stopEvent.timestamp;
      logger.info('✓ Stop event sent successfully', {
        timestamp: stopTimestamp,
        eventId: response.event_id
      });
    }

    // Set outputs
    context.setOutput('success', 'true');
    if (startTimestamp) {
      context.setOutput('start_timestamp', startTimestamp);
    }
    if (stopTimestamp) {
      context.setOutput('stop_timestamp', stopTimestamp);
    }

    const duration = timer.elapsed();
    logger.info(`✅ Action completed successfully in ${duration}ms`, {
      eventState: config.eventState,
      startTimestamp,
      stopTimestamp
    });
  } catch (error) {
    const wrappedError = isLast9Error(error) ? error : wrapError(error as Error);

    logger.error('❌ Action failed', wrappedError, {
      duration: timer.elapsed()
    });

    // Set failure
    core.setFailed(
      `${wrappedError.name}: ${wrappedError.message}${
        isLast9Error(wrappedError) ? ` (${wrappedError.code})` : ''
      }`
    );

    // Set outputs to indicate failure
    core.setOutput('success', 'false');
  } finally {
    logger.endGroup();
  }
}

// Run the action
run().catch(error => {
  console.error('Unhandled error in action:', error);
  process.exit(1);
});
