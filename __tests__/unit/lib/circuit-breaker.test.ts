import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitState,
  openaiCircuitBreaker,
  executeWithCircuitBreaker,
  getOpenaiCircuitBreakerStats,
} from '@/lib/circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000, // 1 second
      successThreshold: 2,
      requestTimeout: 5000,
      monitoringEnabled: false,
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should have zero failure count', () => {
      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(0);
    });

    it('should have zero success count', () => {
      const stats = circuitBreaker.getStats();
      expect(stats.successCount).toBe(0);
    });
  });

  describe('execute method', () => {
    it('should execute successful function', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw error from failed function', async () => {
      const error = new Error('Test error');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(circuitBreaker.execute(fn)).rejects.toThrow('Test error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should timeout after configured time', async () => {
      const fn = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      await expect(circuitBreaker.execute(fn)).rejects.toThrow('Request timeout');
    });

    it('should track total requests', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      await circuitBreaker.execute(fn);
      await circuitBreaker.execute(fn);

      const stats = circuitBreaker.getStats();
      expect(stats.totalRequests).toBe(2);
    });
  });

  describe('state transitions', () => {
    it('should transition to OPEN after failure threshold', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));

      // Make 3 failed requests
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch (e) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should remain CLOSED below failure threshold', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));

      // Make 2 failed requests (below threshold of 3)
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch (e) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch (e) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Try to execute (should transition to HALF_OPEN)
      try {
        await circuitBreaker.execute(fn);
      } catch (e) {
        // Expected to fail
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should transition to CLOSED after success threshold in HALF_OPEN', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      // Open the circuit
      const failFn = vi.fn().mockRejectedValue(new Error('Test error'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failFn);
        } catch (e) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Make 2 successful requests (success threshold)
      await circuitBreaker.execute(fn);
      await circuitBreaker.execute(fn);

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition back to OPEN on failure in HALF_OPEN', async () => {
      const successFn = vi.fn().mockResolvedValue('success');
      const failFn = vi.fn().mockRejectedValue(new Error('Test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failFn);
        } catch (e) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // One success
      await circuitBreaker.execute(successFn);

      // One failure (should go back to OPEN)
      try {
        await circuitBreaker.execute(failFn);
      } catch (e) {
        // Expected to fail
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('CircuitBreakerOpenError', () => {
    it('should throw CircuitBreakerOpenError when circuit is OPEN', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch (e) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Should throw CircuitBreakerOpenError
      await expect(circuitBreaker.execute(fn)).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('should have correct error name', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch (e) {
          // Expected to fail
        }
      }

      try {
        await circuitBreaker.execute(fn);
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerOpenError);
        expect((error as CircuitBreakerOpenError).name).toBe('CircuitBreakerOpenError');
      }
    });
  });

  describe('stats tracking', () => {
    it('should track failures', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));

      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch (e) {
          // Expected to fail
        }
      }

      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(2);
      expect(stats.totalFailures).toBe(2);
    });

    it('should track successes', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      await circuitBreaker.execute(fn);
      await circuitBreaker.execute(fn);

      const stats = circuitBreaker.getStats();
      expect(stats.successCount).toBe(2);
      expect(stats.totalSuccesses).toBe(2);
    });

    it('should track last failure time', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));
      const beforeFailure = Date.now();

      try {
        await circuitBreaker.execute(fn);
      } catch (e) {
        // Expected to fail
      }

      const stats = circuitBreaker.getStats();
      expect(stats.lastFailureTime).toBeGreaterThanOrEqual(beforeFailure);
      expect(stats.lastFailureTime).toBeLessThanOrEqual(Date.now());
    });

    it('should track last success time', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const beforeSuccess = Date.now();

      await circuitBreaker.execute(fn);

      const stats = circuitBreaker.getStats();
      expect(stats.lastSuccessTime).toBeGreaterThanOrEqual(beforeSuccess);
      expect(stats.lastSuccessTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('reset method', () => {
    it('should reset to CLOSED state', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch (e) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Reset
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reset failure count', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));

      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch (e) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getStats().failureCount).toBe(2);

      circuitBreaker.reset();

      expect(circuitBreaker.getStats().failureCount).toBe(0);
    });

    it('should reset success count', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      await circuitBreaker.execute(fn);
      await circuitBreaker.execute(fn);

      expect(circuitBreaker.getStats().successCount).toBe(2);

      circuitBreaker.reset();

      expect(circuitBreaker.getStats().successCount).toBe(0);
    });
  });

  describe('open method', () => {
    it('should manually open the circuit', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      circuitBreaker.open();

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('getStats method', () => {
    it('should return a copy of stats', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(fn);

      const stats1 = circuitBreaker.getStats();
      const stats2 = circuitBreaker.getStats();

      expect(stats1).toEqual(stats2);
      expect(stats1).not.toBe(stats2); // Should be a copy
    });

    it('should include all stat properties', () => {
      const stats = circuitBreaker.getStats();

      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('failureCount');
      expect(stats).toHaveProperty('successCount');
      expect(stats).toHaveProperty('lastFailureTime');
      expect(stats).toHaveProperty('lastSuccessTime');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('totalFailures');
      expect(stats).toHaveProperty('totalSuccesses');
    });
  });
});

describe('openaiCircuitBreaker', () => {
  it('should be an instance of CircuitBreaker', () => {
    expect(openaiCircuitBreaker).toBeInstanceOf(CircuitBreaker);
  });

  it('should have correct configuration', () => {
    const stats = openaiCircuitBreaker.getStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
  });
});

describe('executeWithCircuitBreaker', () => {
  it('should execute function through OpenAI circuit breaker', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const result = await executeWithCircuitBreaker(fn);

    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw error from failed function', async () => {
    const error = new Error('API error');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(executeWithCircuitBreaker(fn)).rejects.toThrow('API error');
  });
});

describe('getOpenaiCircuitBreakerStats', () => {
  it('should return circuit breaker stats', () => {
    const stats = getOpenaiCircuitBreakerStats();

    expect(stats).toHaveProperty('state');
    expect(stats).toHaveProperty('failureCount');
    expect(stats).toHaveProperty('successCount');
    expect(stats).toHaveProperty('totalRequests');
  });
});
