/**
 * Simple event builder for deployment markers
 */

import type { ChangeEvent, Attributes } from './core/types/event';
import { getCurrentTimestamp } from './utils/time';

/**
 * Event builder configuration
 */
export interface EventConfig {
  eventName: string;
  dataSourceName?: string;
}

/**
 * Create a deployment event
 */
export function createDeploymentEvent(
  state: 'start' | 'stop',
  attributes: Attributes,
  config: EventConfig
): ChangeEvent {
  return {
    event_name: config.eventName,
    event_state: state,
    timestamp: getCurrentTimestamp(),
    data_source_name: config.dataSourceName,
    attributes
  };
}
