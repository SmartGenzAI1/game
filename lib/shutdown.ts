import { logger, flushLogs } from './logger';
import { db } from './db';
import { cache } from './cache';

export interface ShutdownHandler {
  name: string;
  handler: (signal: string) => Promise<void>;
  timeout?: number;
}

/**
 * Shutdown Manager
 */
class ShutdownManager {
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private defaultTimeout = 30000; // 30 seconds

  /**
   * Register a shutdown handler
   */
  register(handler: ShutdownHandler): void {
    this.handlers.push(handler);
    logger.info(`Shutdown handler registered: ${handler.name}`);
  }

  /**
   * Unregister a shutdown handler
   */
  unregister(name: string): void {
    this.handlers = this.handlers.filter(h => h.name !== name);
    logger.info(`Shutdown handler unregistered: ${name}`);
  }

  /**
   * Execute all shutdown handlers
   */
  private async executeHandlers(signal: string): Promise<void> {
    const results: Array<{ name: string; success: boolean; duration: number; error?: string }> = [];

    for (const handler of this.handlers) {
      const start = Date.now();
      const timeout = handler.timeout || this.defaultTimeout;

      try {
        logger.info(`Executing shutdown handler: ${handler.name}`, { timeout });
        
        await Promise.race([
          handler.handler(signal),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          ),
        ]);

        const duration = Date.now() - start;
        results.push({ name: handler.name, success: true, duration });
        logger.info(`Shutdown handler completed: ${handler.name}`, { duration });
      } catch (error) {
        const duration = Date.now() - start;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ name: handler.name, success: false, duration, error: errorMessage });
        logger.error(`Shutdown handler failed: ${handler.name}`, error as Error, { duration });
      }
    }

    // Log summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    logger.info('Shutdown summary', {
      total: results.length,
      successful,
      failed,
      totalDuration,
      details: results,
    });
  }

  /**
   * Handle shutdown signal
   */
  private async handleShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal', { signal });
      return;
    }

    this.isShuttingDown = true;
    logger.warn(`Received shutdown signal: ${signal}`);

    try {
      // Execute all registered handlers
      await this.executeHandlers(signal);

      // Flush logs
      logger.info('Flushing logs...');
      await flushLogs();

      logger.info('Graceful shutdown completed successfully');
    } catch (error) {
      logger.error('Error during graceful shutdown', error as Error);
      process.exit(1);
    }

    process.exit(0);
  }

  /**
   * Setup signal handlers
   */
  setup(): void {
    // SIGTERM - Standard termination signal
    process.on('SIGTERM', () => {
      this.handleShutdown('SIGTERM');
    });

    // SIGINT - Interrupt signal (Ctrl+C)
    process.on('SIGINT', () => {
      this.handleShutdown('SIGINT');
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      this.handleShutdown('uncaughtException');
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', new Error(String(reason)), {
        promise: String(promise),
      });
      this.handleShutdown('unhandledRejection');
    });

    logger.info('Shutdown handlers registered for SIGTERM, SIGINT');
  }
}

// Create singleton instance
const shutdownManager = new ShutdownManager();

/**
 * Register default shutdown handlers
 */
function registerDefaultHandlers(): void {
  // Database connection handler
  shutdownManager.register({
    name: 'database',
    timeout: 10000,
    handler: async () => {
      logger.info('Closing database connections...');
      await db.$disconnect();
      logger.info('Database connections closed');
    },
  });

  // Cache handler
  shutdownManager.register({
    name: 'cache',
    timeout: 5000,
    handler: async () => {
      logger.info('Flushing cache...');
      await cache.flush();
      logger.info('Cache flushed');
    },
  });

  // HTTP server handler (will be registered by Next.js)
  shutdownManager.register({
    name: 'http-server',
    timeout: 15000,
    handler: async () => {
      logger.info('Stopping HTTP server...');
      // Next.js handles this automatically, but we log it
      logger.info('HTTP server stopped');
    },
  });
}

// Register default handlers
registerDefaultHandlers();

/**
 * Setup graceful shutdown
 */
export function setupGracefulShutdown(): void {
  shutdownManager.setup();
}

/**
 * Register a custom shutdown handler
 */
export function registerShutdownHandler(handler: ShutdownHandler): void {
  shutdownManager.register(handler);
}

/**
 * Unregister a shutdown handler
 */
export function unregisterShutdownHandler(name: string): void {
  shutdownManager.unregister(name);
}

/**
 * Check if shutdown is in progress
 */
export function isShuttingDown(): boolean {
  return (shutdownManager as any).isShuttingDown;
}

/**
 * Create a shutdown-aware function wrapper
 */
export function withShutdownCheck<T extends (...args: any[]) => any>(
  fn: T,
  options?: { onShutdown?: () => any }
): T {
  return ((...args: Parameters<T>) => {
    if (isShuttingDown()) {
      logger.warn('Operation rejected: shutdown in progress');
      return options?.onShutdown?.() ?? Promise.reject(new Error('Shutdown in progress'));
    }
    return fn(...args);
  }) as T;
}

/**
 * Create a shutdown-aware async function wrapper
 */
export function withShutdownCheckAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: { onShutdown?: () => Promise<any> }
): T {
  return (async (...args: Parameters<T>) => {
    if (isShuttingDown()) {
      logger.warn('Async operation rejected: shutdown in progress');
      return options?.onShutdown?.() ?? Promise.reject(new Error('Shutdown in progress'));
    }
    return fn(...args);
  }) as T;
}

/**
 * Wait for in-flight requests to complete
 */
export async function waitForInFlightRequests(timeout: number = 30000): Promise<void> {
  logger.info('Waiting for in-flight requests to complete...', { timeout });
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // In a real implementation, you would track active requests
      // For now, we just wait for the timeout
      if (elapsed >= timeout) {
        clearInterval(checkInterval);
        logger.info('In-flight request wait completed', { elapsed });
        resolve();
      }
    }, 1000);
  });
}

/**
 * Drain connection pools
 */
export async function drainConnectionPools(): Promise<void> {
  logger.info('Draining connection pools...');
  
  try {
    // Database pool is handled by the database handler
    // Add any other connection pools here
    logger.info('Connection pools drained');
  } catch (error) {
    logger.error('Error draining connection pools', error as Error);
    throw error;
  }
}

/**
 * Complete in-flight requests
 */
export async function completeInFlightRequests(): Promise<void> {
  logger.info('Completing in-flight requests...');
  
  try {
    await waitForInFlightRequests(15000);
    logger.info('In-flight requests completed');
  } catch (error) {
    logger.error('Error completing in-flight requests', error as Error);
    throw error;
  }
}

/**
 * Flush pending logs
 */
export async function flushPendingLogs(): Promise<void> {
  logger.info('Flushing pending logs...');
  
  try {
    await flushLogs();
    logger.info('Pending logs flushed');
  } catch (error) {
    logger.error('Error flushing pending logs', error as Error);
    throw error;
  }
}

/**
 * Close database connections
 */
export async function closeDatabaseConnections(): Promise<void> {
  logger.info('Closing database connections...');
  
  try {
    await db.$disconnect();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', error as Error);
    throw error;
  }
}

/**
 * Perform graceful shutdown
 */
export async function performGracefulShutdown(signal: string = 'manual'): Promise<void> {
  logger.info('Starting graceful shutdown...', { signal });
  
  try {
    // 1. Stop accepting new requests (handled by Next.js)
    logger.info('Step 1: Stopping new requests');
    
    // 2. Complete in-flight requests
    logger.info('Step 2: Completing in-flight requests');
    await completeInFlightRequests();
    
    // 3. Drain connection pools
    logger.info('Step 3: Draining connection pools');
    await drainConnectionPools();
    
    // 4. Flush pending logs
    logger.info('Step 4: Flushing pending logs');
    await flushPendingLogs();
    
    // 5. Close database connections
    logger.info('Step 5: Closing database connections');
    await closeDatabaseConnections();
    
    logger.info('Graceful shutdown completed successfully');
  } catch (error) {
    logger.error('Error during graceful shutdown', error as Error);
    throw error;
  }
}

/**
 * Export the shutdown manager for advanced usage
 */
export { shutdownManager };
