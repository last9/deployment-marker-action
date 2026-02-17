/**
 * Plugin and provider registry with dependency injection
 */

import type {
  Plugin,
  EventPlugin,
  AttributeProvider,
  OutputHandler,
  TelemetryPlugin
} from './types/plugin';
import type { ApiClient, TokenManager, ContextProvider, StorageProvider } from './types/provider';
import type { ActionContext, PluginsConfig } from './types/context';
import { PluginNotFoundError, PluginInitError } from '../utils/errors';
import { getLogger } from '../utils/logger';

/**
 * Provider type enumeration
 */
export enum ProviderType {
  API_CLIENT = 'api',
  TOKEN_MANAGER = 'token',
  CONTEXT = 'context',
  STORAGE = 'storage'
}

/**
 * Plugin type enumeration
 */
export enum PluginType {
  EVENT = 'event',
  ATTRIBUTE = 'attribute',
  OUTPUT = 'output',
  TELEMETRY = 'telemetry'
}

/**
 * Registry for managing plugins and providers
 *
 * Implements dependency injection pattern for extensibility
 */
export class PluginRegistry {
  private readonly logger = getLogger();

  // Provider storage
  private readonly providers = new Map<ProviderType, unknown>();

  // Plugin storage by type
  private readonly eventPlugins = new Map<string, EventPlugin>();
  private readonly attributeProviders = new Map<string, AttributeProvider>();
  private readonly outputHandlers = new Map<string, OutputHandler>();
  private readonly telemetryPlugins = new Map<string, TelemetryPlugin>();

  // Initialization state
  private initialized = false;

  /**
   * Register a provider
   * @param type - Provider type
   * @param provider - Provider instance
   */
  registerProvider<T>(type: ProviderType, provider: T): void {
    if (this.initialized) {
      throw new Error(`Cannot register provider ${type} after initialization`);
    }

    this.providers.set(type, provider);
    this.logger.debug(`Registered provider: ${type}`);
  }

  /**
   * Get a provider by type
   * @param type - Provider type
   * @returns Provider instance
   */
  getProvider<T>(type: ProviderType): T {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider not found: ${type}`);
    }
    return provider as T;
  }

  /**
   * Register an event plugin
   * @param plugin - Event plugin instance
   */
  registerEventPlugin(plugin: EventPlugin): void {
    if (this.initialized) {
      throw new Error(`Cannot register plugin ${plugin.metadata.name} after initialization`);
    }

    this.eventPlugins.set(plugin.metadata.name, plugin);
    this.logger.debug(`Registered event plugin: ${plugin.metadata.name}`);
  }

  /**
   * Register an attribute provider
   * @param provider - Attribute provider instance
   */
  registerAttributeProvider(provider: AttributeProvider): void {
    if (this.initialized) {
      throw new Error(`Cannot register provider ${provider.metadata.name} after initialization`);
    }

    this.attributeProviders.set(provider.metadata.name, provider);
    this.logger.debug(`Registered attribute provider: ${provider.metadata.name}`);
  }

  /**
   * Register an output handler
   * @param handler - Output handler instance
   */
  registerOutputHandler(handler: OutputHandler): void {
    if (this.initialized) {
      throw new Error(`Cannot register handler ${handler.metadata.name} after initialization`);
    }

    this.outputHandlers.set(handler.metadata.name, handler);
    this.logger.debug(`Registered output handler: ${handler.metadata.name}`);
  }

  /**
   * Register a telemetry plugin
   * @param plugin - Telemetry plugin instance
   */
  registerTelemetryPlugin(plugin: TelemetryPlugin): void {
    if (this.initialized) {
      throw new Error(`Cannot register plugin ${plugin.metadata.name} after initialization`);
    }

    this.telemetryPlugins.set(plugin.metadata.name, plugin);
    this.logger.debug(`Registered telemetry plugin: ${plugin.metadata.name}`);
  }

  /**
   * Initialize all plugins with configuration
   * @param config - Plugins configuration
   * @param context - Action context
   */
  async initialize(config: PluginsConfig, context: ActionContext): Promise<void> {
    if (this.initialized) {
      throw new Error('Registry already initialized');
    }

    this.logger.startGroup('Initializing plugins');

    try {
      // Initialize event plugins
      await this.initializePlugins(
        Array.from(this.eventPlugins.values()),
        config,
        context,
        'event'
      );

      // Initialize attribute providers
      await this.initializePlugins(
        Array.from(this.attributeProviders.values()),
        config,
        context,
        'attribute'
      );

      // Initialize output handlers
      await this.initializePlugins(
        Array.from(this.outputHandlers.values()),
        config,
        context,
        'output'
      );

      // Initialize telemetry plugins
      await this.initializePlugins(
        Array.from(this.telemetryPlugins.values()),
        config,
        context,
        'telemetry'
      );

      this.initialized = true;
      this.logger.info('All plugins initialized successfully');
    } catch (error) {
      this.logger.error('Plugin initialization failed', error as Error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  /**
   * Initialize a group of plugins
   */
  private async initializePlugins(
    plugins: Plugin[],
    config: PluginsConfig,
    context: ActionContext,
    type: string
  ): Promise<void> {
    for (const plugin of plugins) {
      const pluginName = plugin.metadata.name;

      // Skip if not enabled
      if (!config.enabled.includes(pluginName)) {
        this.logger.debug(`Skipping disabled plugin: ${pluginName}`);
        continue;
      }

      try {
        const pluginConfig = {
          enabled: true,
          ...(config.config[pluginName] || {})
        };

        await plugin.initialize(pluginConfig, context);
        this.logger.info(`Initialized ${type} plugin: ${pluginName} v${plugin.metadata.version}`);
      } catch (error) {
        throw new PluginInitError(
          pluginName,
          `Failed to initialize plugin: ${(error as Error).message}`,
          { originalError: error }
        );
      }
    }
  }

  /**
   * Get event plugin that can handle event type
   * @param eventType - Event type
   * @returns Event plugin instance
   */
  getEventPlugin(eventType: string): EventPlugin {
    for (const plugin of this.eventPlugins.values()) {
      if (plugin.canHandle(eventType)) {
        return plugin;
      }
    }

    throw new PluginNotFoundError(`No event plugin found for type: ${eventType}`);
  }

  /**
   * Get all attribute providers for event type
   * @param eventType - Event type
   * @returns Sorted attribute providers
   */
  getAttributeProviders(eventType: string): AttributeProvider[] {
    const providers = Array.from(this.attributeProviders.values()).filter(provider =>
      provider.shouldProvide(eventType)
    );

    // Sort by priority (higher priority first)
    return providers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all output handlers
   * @returns Output handlers
   */
  getOutputHandlers(): OutputHandler[] {
    return Array.from(this.outputHandlers.values());
  }

  /**
   * Get all telemetry plugins
   * @returns Telemetry plugins
   */
  getTelemetryPlugins(): TelemetryPlugin[] {
    return Array.from(this.telemetryPlugins.values());
  }

  /**
   * Dispose all plugins
   */
  async dispose(): Promise<void> {
    this.logger.startGroup('Disposing plugins');

    try {
      // Dispose all plugins in reverse order
      const allPlugins: Plugin[] = [
        ...Array.from(this.telemetryPlugins.values()),
        ...Array.from(this.outputHandlers.values()),
        ...Array.from(this.attributeProviders.values()),
        ...Array.from(this.eventPlugins.values())
      ];

      for (const plugin of allPlugins) {
        try {
          await plugin.dispose();
          this.logger.debug(`Disposed plugin: ${plugin.metadata.name}`);
        } catch (error) {
          this.logger.warning(
            `Failed to dispose plugin: ${plugin.metadata.name}`,
            { error: (error as Error).message }
          );
        }
      }

      this.logger.info('All plugins disposed');
    } finally {
      this.logger.endGroup();
    }
  }

  /**
   * Get API client provider
   */
  getApiClient(): ApiClient {
    return this.getProvider<ApiClient>(ProviderType.API_CLIENT);
  }

  /**
   * Get token manager provider
   */
  getTokenManager(): TokenManager {
    return this.getProvider<TokenManager>(ProviderType.TOKEN_MANAGER);
  }

  /**
   * Get context provider
   */
  getContext(): ContextProvider {
    return this.getProvider<ContextProvider>(ProviderType.CONTEXT);
  }

  /**
   * Get storage provider (optional)
   */
  getStorage(): StorageProvider | undefined {
    try {
      return this.getProvider<StorageProvider>(ProviderType.STORAGE);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
