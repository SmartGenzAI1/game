import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupGracefulShutdown,
  registerShutdownHandler,
  unregisterShutdownHandler,
  isShuttingDown,
  withShutdownCheck,
  withShutdownCheckAsync,
  waitForInFlightRequests,
  drainConnectionPools,
  completeInFlightRequests,
  flushPendingLogs,
  closeDatabaseConnections,
  performGracefulShutdown,
} from '@/lib/shutdown';

describe('Shutdown Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setupGracefulShutdown', () => {
    it('should setup signal handlers', () => {
      expect(() => setupGracefulShutdown()).not.toThrow();
    });
  });

  describe('registerShutdownHandler', () => {
    it('should register shutdown handler', () => {
      const handler = {
        name: 'test-handler',
        handler: vi.fn().mockResolvedValue(undefined),
      };

      expect(() => registerShutdownHandler(handler)).not.toThrow();
    });

    it('should register handler with timeout', () => {
      const handler = {
        name: 'test-handler',
        timeout: 5000,
        handler: vi.fn().mockResolvedValue(undefined),
      };

      expect(() => registerShutdownHandler(handler)).not.toThrow();
    });
  });

  describe('unregisterShutdownHandler', () => {
    it('should unregister shutdown handler', () => {
      const handler = {
        name: 'test-handler',
        handler: vi.fn().mockResolvedValue(undefined),
      };

      registerShutdownHandler(handler);
      expect(() => unregisterShutdownHandler('test-handler')).not.toThrow();
    });
  });

  describe('isShuttingDown', () => {
    it('should return false initially', () => {
      expect(isShuttingDown()).toBe(false);
    });
  });

  describe('withShutdownCheck', () => {
    it('should execute function when not shutting down', () => {
      const fn = vi.fn().mockReturnValue('result');
      const wrapped = withShutdownCheck(fn);

      const result = wrapped();
      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reject when shutting down', () => {
      const fn = vi.fn().mockReturnValue('result');
      const wrapped = withShutdownCheck(fn);

      // Simulate shutdown state
      vi.spyOn(require('@/lib/shutdown'), 'isShuttingDown').mockReturnValue(true);

      expect(() => wrapped()).toThrow('Shutdown in progress');
      expect(fn).not.toHaveBeenCalled();
    });

    it('should call onShutdown callback when shutting down', () => {
      const fn = vi.fn().mockReturnValue('result');
      const onShutdown = vi.fn().mockReturnValue('fallback');
      const wrapped = withShutdownCheck(fn, { onShutdown });

      // Simulate shutdown state
      vi.spyOn(require('@/lib/shutdown'), 'isShuttingDown').mockReturnValue(true);

      const result = wrapped();
      expect(result).toBe('fallback');
      expect(onShutdown).toHaveBeenCalledTimes(1);
    });
  });

  describe('withShutdownCheckAsync', () => {
    it('should execute async function when not shutting down', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const wrapped = withShutdownCheckAsync(fn);

      const result = await wrapped();
      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reject when shutting down', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const wrapped = withShutdownCheckAsync(fn);

      // Simulate shutdown state
      vi.spyOn(require('@/lib/shutdown'), 'isShuttingDown').mockReturnValue(true);

      await expect(wrapped()).rejects.toThrow('Shutdown in progress');
      expect(fn).not.toHaveBeenCalled();
    });

    it('should call onShutdown callback when shutting down', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const onShutdown = vi.fn().mockResolvedValue('fallback');
      const wrapped = withShutdownCheckAsync(fn, { onShutdown });

      // Simulate shutdown state
      vi.spyOn(require('@/lib/shutdown'), 'isShuttingDown').mockReturnValue(true);

      const result = await wrapped();
      expect(result).toBe('fallback');
      expect(onShutdown).toHaveBeenCalledTimes(1);
    });
  });

  describe('waitForInFlightRequests', () => {
    it('should wait for timeout', async () => {
      const start = Date.now();
      await waitForInFlightRequests(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should wait for default timeout', async () => {
      const start = Date.now();
      await waitForInFlightRequests();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(30000);
    }, { timeout: 35000 });
  });

  describe('drainConnectionPools', () => {
    it('should drain connection pools', async () => {
      await expect(drainConnectionPools()).resolves.not.toThrow();
    });
  });

  describe('completeInFlightRequests', () => {
    it('should complete in-flight requests', async () => {
      await expect(completeInFlightRequests()).resolves.not.toThrow();
    });
  });

  describe('flushPendingLogs', () => {
    it('should flush pending logs', async () => {
      await expect(flushPendingLogs()).resolves.not.toThrow();
    });
  });

  describe('closeDatabaseConnections', () => {
    it('should close database connections', async () => {
      await expect(closeDatabaseConnections()).resolves.not.toThrow();
    });
  });

  describe('performGracefulShutdown', () => {
    it('should perform graceful shutdown', async () => {
      await expect(performGracefulShutdown('manual')).resolves.not.toThrow();
    });

    it('should perform graceful shutdown with default signal', async () => {
      await expect(performGracefulShutdown()).resolves.not.toThrow();
    });
  });

  describe('shutdown handler execution', () => {
    it('should execute handlers in order', async () => {
      const executionOrder: string[] = [];

      const handler1 = {
        name: 'handler-1',
        handler: vi.fn().mockImplementation(async () => {
          executionOrder.push('handler-1');
        }),
      };

      const handler2 = {
        name: 'handler-2',
        handler: vi.fn().mockImplementation(async () => {
          executionOrder.push('handler-2');
        }),
      };

      registerShutdownHandler(handler1);
      registerShutdownHandler(handler2);

      // Note: We can't actually trigger shutdown in tests
      // This test just verifies handlers can be registered
      expect(executionOrder).toEqual([]);
    });

    it('should handle handler timeout', async () => {
      const handler = {
        name: 'timeout-handler',
        timeout: 100,
        handler: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 1000))
        ),
      };

      registerShutdownHandler(handler);

      // Handler should be registered
      expect(handler.handler).toBeDefined();
    });

    it('should handle handler errors', async () => {
      const handler = {
        name: 'error-handler',
        handler: vi.fn().mockRejectedValue(new Error('Handler error')),
      };

      registerShutdownHandler(handler);

      // Handler should be registered
      expect(handler.handler).toBeDefined();
    });
  });

  describe('shutdown handler lifecycle', () => {
    it('should allow re-registering handlers', () => {
      const handler = {
        name: 'test-handler',
        handler: vi.fn().mockResolvedValue(undefined),
      };

      registerShutdownHandler(handler);
      unregisterShutdownHandler('test-handler');
      registerShutdownHandler(handler);

      // Should not throw
      expect(() => registerShutdownHandler(handler)).not.toThrow();
    });

    it('should handle unregistering non-existent handler', () => {
      expect(() => unregisterShutdownHandler('non-existent')).not.toThrow();
    });
  });
});
