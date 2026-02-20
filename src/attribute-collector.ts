/**
 * Simple attribute collection from GitHub context
 */

import type { Attributes } from './core/types/event';
import type { ContextProvider } from './core/types/provider';
import { getLogger } from './utils/logger';

/**
 * Attribute collection configuration
 */
export interface AttributeConfig {
  includeGitHub: boolean;
  customAttributes: Record<string, string | number | boolean>;
  serviceName: string;
  env: string;
}

/**
 * Collect attributes from GitHub context and custom inputs
 */
export function collectAttributes(
  context: ContextProvider,
  config: AttributeConfig
): Attributes {
  const logger = getLogger();
  const attributes: Attributes = {};

  // Always set required correlation attributes first
  attributes['service_name'] = config.serviceName;
  attributes['env'] = config.env;

  // Collect GitHub context attributes
  if (config.includeGitHub) {
    try {
      const repo = context.getRepository();
      const workflow = context.getWorkflow();
      const commit = context.getCommit();
      const actor = context.getActor();
      const event = context.getEvent();

      attributes['repository'] = repo.fullName;
      attributes['workflow'] = workflow.name;
      attributes['run_id'] = workflow.runId.toString();
      attributes['run_number'] = workflow.runNumber.toString();
      attributes['run_attempt'] = workflow.runAttempt.toString();
      attributes['commit_sha'] = commit.sha;
      attributes['ref'] = commit.ref;
      attributes['commit_message'] = commit.message;
      attributes['actor'] = actor.username;
      attributes['event_name'] = event.name;

      logger.debug('Collected GitHub attributes', {
        count: Object.keys(attributes).length
      });
    } catch (error) {
      logger.warning('Failed to collect some GitHub attributes', {
        error: (error as Error).message
      });
    }
  }

  // Merge custom attributes (these override GitHub attributes)
  for (const [key, value] of Object.entries(config.customAttributes)) {
    attributes[key] = value;
  }

  logger.info('Attributes collected', {
    total: Object.keys(attributes).length,
    github: config.includeGitHub,
    custom: Object.keys(config.customAttributes).length
  });

  return attributes;
}
