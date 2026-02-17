/**
 * Tests for plugin registry
 */

import { PluginRegistry, ProviderType } from '../registry';
import type {
  EventPlugin,
  AttributeProvider,
  PluginMetadata
} from '../types/plugin';
import type { ApiClient, TokenManager, ContextProvider } from '../types/provider';
import type { ActionContext } from '../types/context';
import type { ChangeEvent, Attributes, ValidationResult } from '../types/event';

// Mock plugins
class MockEventPlugin implements EventPlugin {
  readonly metadata: PluginMetadata = {
    name: 'mock-event',
    version: '1.0.0',
    description: 'Mock event plugin'
  };

  readonly supportedEventTypes = ['test'];

  async initialize(): Promise<void> {}
  async dispose(): Promise<void> {}

  async createEvent(): Promise<ChangeEvent> {
    return {
      event_name: 'test',
      event_state: 'start',
      attributes: {}
    };
  }

  validate(): ValidationResult {
    return { valid: true, errors: [], warnings: [] };
  }

  canHandle(type: string): boolean {
    return type === 'test';
  }
}

class MockAttributeProvider implements AttributeProvider {
  readonly metadata: PluginMetadata = {
    name: 'mock-attribute',
    version: '1.0.0',
    description: 'Mock attribute provider'
  };

  readonly priority = 10;

  async initialize(): Promise<void> {}
  async dispose(): Promise<void> {}

  async provideAttributes(): Promise<Attributes> {
    return { key: 'value' };
  }

  shouldProvide(): boolean {
    return true;
  }
}

// Mock providers
const mockApiClient: ApiClient = {
  baseUrl: 'https://api.test.com',
  version: 'v1',
  sendChangeEvent: jest.fn(),
  refreshAccessToken: jest.fn(),
  healthCheck: jest.fn()
};

const mockTokenManager: TokenManager = {
  getAccessToken: jest.fn(),
  isTokenExpired: jest.fn(),
  clearCache: jest.fn()
};

const mockContextProvider: ContextProvider = {
  getRepository: jest.fn(),
  getWorkflow: jest.fn(),
  getCommit: jest.fn(),
  getActor: jest.fn(),
  getEvent: jest.fn(),
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setSecret: jest.fn()
};

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('Provider Registration', () => {
    it('should register and retrieve API client', () => {
      registry.registerProvider(ProviderType.API_CLIENT, mockApiClient);

      const retrieved = registry.getApiClient();
      expect(retrieved).toBe(mockApiClient);
    });

    it('should register and retrieve token manager', () => {
      registry.registerProvider(ProviderType.TOKEN_MANAGER, mockTokenManager);

      const retrieved = registry.getTokenManager();
      expect(retrieved).toBe(mockTokenManager);
    });

    it('should register and retrieve context provider', () => {
      registry.registerProvider(ProviderType.CONTEXT, mockContextProvider);

      const retrieved = registry.getContext();
      expect(retrieved).toBe(mockContextProvider);
    });

    it('should throw error when provider not found', () => {
      expect(() => registry.getApiClient()).toThrow('Provider not found: api');
    });

    it('should not allow registration after initialization', async () => {
      const mockConfig = {
        enabled: [],
        config: {}
      };

      const mockContext = {} as ActionContext;

      await registry.initialize(mockConfig, mockContext);

      expect(() =>
        registry.registerProvider(ProviderType.API_CLIENT, mockApiClient)
      ).toThrow('Cannot register provider api after initialization');
    });
  });

  describe('Plugin Registration', () => {
    it('should register event plugin', () => {
      const plugin = new MockEventPlugin();
      registry.registerEventPlugin(plugin);

      const retrieved = registry.getEventPlugin('test');
      expect(retrieved).toBe(plugin);
    });

    it('should register attribute provider', () => {
      const provider = new MockAttributeProvider();
      registry.registerAttributeProvider(provider);

      const providers = registry.getAttributeProviders('test');
      expect(providers).toContain(provider);
    });

    it('should throw error when event plugin not found', () => {
      expect(() => registry.getEventPlugin('unknown')).toThrow(
        'No event plugin found for type: unknown'
      );
    });
  });

  describe('Initialization', () => {
    it('should initialize all registered plugins', async () => {
      const eventPlugin = new MockEventPlugin();
      const attributeProvider = new MockAttributeProvider();

      const initSpy1 = jest.spyOn(eventPlugin, 'initialize');
      const initSpy2 = jest.spyOn(attributeProvider, 'initialize');

      registry.registerEventPlugin(eventPlugin);
      registry.registerAttributeProvider(attributeProvider);

      const config = {
        enabled: ['mock-event', 'mock-attribute'],
        config: {}
      };

      const context = {} as ActionContext;

      await registry.initialize(config, context);

      expect(initSpy1).toHaveBeenCalledWith({ enabled: true }, context);
      expect(initSpy2).toHaveBeenCalledWith({ enabled: true }, context);
      expect(registry.isInitialized()).toBe(true);
    });

    it('should skip disabled plugins', async () => {
      const plugin = new MockEventPlugin();
      const initSpy = jest.spyOn(plugin, 'initialize');

      registry.registerEventPlugin(plugin);

      const config = {
        enabled: [], // Plugin not enabled
        config: {}
      };

      const context = {} as ActionContext;

      await registry.initialize(config, context);

      expect(initSpy).not.toHaveBeenCalled();
    });

    it('should pass plugin-specific config', async () => {
      const plugin = new MockEventPlugin();
      const initSpy = jest.spyOn(plugin, 'initialize');

      registry.registerEventPlugin(plugin);

      const config = {
        enabled: ['mock-event'],
        config: {
          'mock-event': {
            customOption: 'value'
          }
        }
      };

      const context = {} as ActionContext;

      await registry.initialize(config, context);

      expect(initSpy).toHaveBeenCalledWith(
        { enabled: true, customOption: 'value' },
        context
      );
    });

    it('should not allow re-initialization', async () => {
      const config = { enabled: [], config: {} };
      const context = {} as ActionContext;

      await registry.initialize(config, context);

      await expect(registry.initialize(config, context)).rejects.toThrow(
        'Registry already initialized'
      );
    });
  });

  describe('Attribute Provider Ordering', () => {
    it('should return providers sorted by priority', () => {
      class HighPriorityProvider implements AttributeProvider {
        readonly metadata: PluginMetadata = {
          name: 'high',
          version: '1.0.0',
          description: 'High'
        };
        readonly priority = 100;

        async initialize(): Promise<void> {}
        async dispose(): Promise<void> {}
        async provideAttributes(): Promise<Attributes> {
          return { key: 'high-value' };
        }
        shouldProvide(): boolean {
          return true;
        }
      }

      class LowPriorityProvider implements AttributeProvider {
        readonly metadata: PluginMetadata = {
          name: 'low',
          version: '1.0.0',
          description: 'Low'
        };
        readonly priority = 10;

        async initialize(): Promise<void> {}
        async dispose(): Promise<void> {}
        async provideAttributes(): Promise<Attributes> {
          return { key: 'low-value' };
        }
        shouldProvide(): boolean {
          return true;
        }
      }

      const high = new HighPriorityProvider();
      const low = new LowPriorityProvider();

      registry.registerAttributeProvider(low);
      registry.registerAttributeProvider(high);

      const providers = registry.getAttributeProviders('test');

      expect(providers[0]).toBe(high);
      expect(providers[1]).toBe(low);
    });
  });

  describe('Disposal', () => {
    it('should dispose all plugins', async () => {
      const eventPlugin = new MockEventPlugin();
      const attributeProvider = new MockAttributeProvider();

      const disposeSpy1 = jest.spyOn(eventPlugin, 'dispose');
      const disposeSpy2 = jest.spyOn(attributeProvider, 'dispose');

      registry.registerEventPlugin(eventPlugin);
      registry.registerAttributeProvider(attributeProvider);

      await registry.dispose();

      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();
    });

    it('should continue disposing even if one plugin fails', async () => {
      const plugin1 = new MockEventPlugin();
      const plugin2 = new MockEventPlugin();

      plugin1.dispose = jest.fn().mockRejectedValue(new Error('Disposal failed'));
      const disposeSpy2 = jest.spyOn(plugin2, 'dispose');

      registry.registerEventPlugin(plugin1);
      registry.registerEventPlugin(plugin2);

      await registry.dispose();

      expect(disposeSpy2).toHaveBeenCalled();
    });
  });
});
