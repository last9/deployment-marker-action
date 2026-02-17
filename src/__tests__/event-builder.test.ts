/**
 * Tests for event builder
 */

import { createDeploymentEvent } from '../event-builder';

describe('createDeploymentEvent', () => {
  it('should create start event with all fields', () => {
    const event = createDeploymentEvent(
      'start',
      {
        service_name: 'api',
        environment: 'production'
      },
      {
        eventName: 'deployment',
        dataSourceName: 'prod-cluster'
      }
    );

    expect(event.event_name).toBe('deployment');
    expect(event.event_state).toBe('start');
    expect(event.data_source_name).toBe('prod-cluster');
    expect(event.attributes).toEqual({
      service_name: 'api',
      environment: 'production'
    });
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO8601 format
  });

  it('should create stop event', () => {
    const event = createDeploymentEvent(
      'stop',
      { version: '1.0.0' },
      { eventName: 'release' }
    );

    expect(event.event_name).toBe('release');
    expect(event.event_state).toBe('stop');
    expect(event.attributes).toEqual({ version: '1.0.0' });
  });

  it('should handle empty attributes', () => {
    const event = createDeploymentEvent('start', {}, { eventName: 'test' });

    expect(event.attributes).toEqual({});
  });

  it('should include timestamp', () => {
    const before = new Date();
    const event = createDeploymentEvent('start', {}, { eventName: 'test' });
    const after = new Date();

    const timestamp = new Date(event.timestamp!);
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
