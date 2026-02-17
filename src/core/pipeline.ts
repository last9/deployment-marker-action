/**
 * Middleware pipeline execution engine
 */

import type {
  Middleware,
  MiddlewareContext,
  MiddlewareNext,
  MiddlewarePhase
} from './types/middleware';
import type { ChangeEvent, ChangeEventResponse } from './types/event';
import { getLogger } from '../utils/logger';

/**
 * Middleware pipeline for composable request/response handling
 *
 * Executes middleware in phases:
 * 1. Pre-phase: Before API call (validation, preparation)
 * 2. Execution: Actual API call
 * 3. Post-phase: After API call (processing, logging)
 * 4. Error-phase: On any error (transformation, logging)
 */
export class MiddlewarePipeline {
  private readonly logger = getLogger();
  private readonly middleware: Middleware[] = [];

  /**
   * Register middleware in pipeline
   * @param middleware - Middleware to register
   */
  register(middleware: Middleware): void {
    this.middleware.push(middleware);
    this.logger.debug(`Registered middleware: ${middleware.name} (${middleware.phase})`);
  }

  /**
   * Register multiple middleware
   * @param middleware - Array of middleware to register
   */
  registerAll(middleware: Middleware[]): void {
    middleware.forEach(m => this.register(m));
  }

  /**
   * Execute pipeline with operation
   * @param operation - Operation to execute
   * @param event - Event being processed
   * @returns Operation result
   */
  async execute<T>(
    operation: () => Promise<T>,
    event?: ChangeEvent
  ): Promise<T> {
    const context = this.createContext(event);

    try {
      // Execute pre-phase middleware
      await this.executePhase('pre', context);

      // Execute the operation
      const result = await operation();

      // Store result in context
      if (this.isChangeEventResponse(result)) {
        context.eventResponse = result;
      }

      // Execute post-phase middleware
      await this.executePhase('post', context);

      return result;
    } catch (error) {
      // Store error in context
      context.error = error as Error;

      // Execute error-phase middleware
      await this.executePhase('error', context);

      // Re-throw error after error handling
      throw error;
    }
  }

  /**
   * Execute middleware phase
   * @param phase - Phase to execute
   * @param context - Middleware context
   */
  private async executePhase(
    phase: MiddlewarePhase,
    context: MiddlewareContext
  ): Promise<void> {
    // Get middleware for this phase
    const phaseMiddleware = this.middleware
      .filter(m => m.phase === phase)
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    if (phaseMiddleware.length === 0) {
      return;
    }

    this.logger.debug(`Executing ${phase} middleware (${phaseMiddleware.length} middleware)`);

    // Build middleware chain
    let index = 0;

    const next: MiddlewareNext = async () => {
      if (index >= phaseMiddleware.length) {
        return;
      }

      const middleware = phaseMiddleware[index++];

      if (!middleware) {
        return;
      }

      try {
        await middleware.execute(context, next);
      } catch (error) {
        this.logger.error(
          `Middleware ${middleware.name} failed`,
          error as Error,
          { phase, middleware: middleware.name }
        );
        throw error;
      }
    };

    // Start middleware chain
    await next();
  }

  /**
   * Create middleware context
   * @param event - Event being processed
   * @returns Middleware context
   */
  private createContext(event?: ChangeEvent): MiddlewareContext {
    const metadata = new Map<string, unknown>();

    return {
      event,
      metadata,
      set(key: string, value: unknown): void {
        metadata.set(key, value);
      },
      get<T>(key: string): T | undefined {
        return metadata.get(key) as T | undefined;
      },
      has(key: string): boolean {
        return metadata.has(key);
      }
    };
  }

  /**
   * Type guard for ChangeEventResponse
   */
  private isChangeEventResponse(value: unknown): value is ChangeEventResponse {
    return (
      typeof value === 'object' &&
      value !== null &&
      'success' in value
    );
  }

  /**
   * Get all registered middleware
   */
  getMiddleware(): ReadonlyArray<Middleware> {
    return this.middleware;
  }

  /**
   * Clear all middleware
   */
  clear(): void {
    this.middleware.length = 0;
    this.logger.debug('Cleared all middleware');
  }
}
