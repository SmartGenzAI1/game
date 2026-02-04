/**
 * Circuit Breaker Pattern Implementation
 * 
 * This module implements the circuit breaker pattern to prevent cascading failures
 * when calling external services like OpenAI API.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation, requests pass through
  OPEN = 'OPEN',          // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  // Number of failures before opening the circuit
  failureThreshold: number
  
  // Time in milliseconds to wait before trying again
  resetTimeout: number
  
  // Number of successful requests needed to close the circuit
  successThreshold: number
  
  // Timeout in milliseconds for individual requests
  requestTimeout: number
  
  // Enable monitoring
  monitoringEnabled: boolean
}

export interface CircuitBreakerStats {
  state: CircuitState
  failureCount: number
  successCount: number
  lastFailureTime: number | null
  lastSuccessTime: number | null
  totalRequests: number
  totalFailures: number
  totalSuccesses: number
}

export class CircuitBreaker {
  private state: CircuitState
  private failureCount: number
  private successCount: number
  private lastFailureTime: number | null
  private lastSuccessTime: number | null
  private nextAttemptTime: number | null
  private stats: CircuitBreakerStats
  private config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
    this.lastSuccessTime = null
    this.nextAttemptTime = null
    
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      resetTimeout: config.resetTimeout || 60000, // 1 minute
      successThreshold: config.successThreshold || 2,
      requestTimeout: config.requestTimeout || 30000, // 30 seconds
      monitoringEnabled: config.monitoringEnabled ?? true,
    }
    
    this.stats = {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    }
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < (this.nextAttemptTime || 0)) {
        throw new CircuitBreakerOpenError('Circuit breaker is OPEN')
      }
      // Try to transition to half-open
      this.transitionToHalfOpen()
    }

    this.stats.totalRequests++

    try {
      // Execute with timeout
      const result = await this.withTimeout(fn, this.config.requestTimeout)
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error as Error)
      throw error
    }
  }

  /**
   * Execute function with timeout
   */
  private async withTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ])
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.failureCount = 0
    this.successCount++
    this.lastSuccessTime = Date.now()
    this.stats.totalSuccesses++

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed()
      }
    }

    this.updateStats()
  }

  /**
   * Handle failed request
   */
  private onFailure(error: Error): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    this.stats.totalFailures++

    if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen()
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen()
    }

    this.updateStats()
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN
    this.nextAttemptTime = Date.now() + this.config.resetTimeout
    this.successCount = 0
    
    if (this.config.monitoringEnabled) {
      console.warn(`Circuit breaker OPENED at ${new Date().toISOString()}`)
    }
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.nextAttemptTime = null
    
    if (this.config.monitoringEnabled) {
      console.info(`Circuit breaker CLOSED at ${new Date().toISOString()}`)
    }
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN
    this.successCount = 0
    
    if (this.config.monitoringEnabled) {
      console.info(`Circuit breaker HALF_OPEN at ${new Date().toISOString()}`)
    }
  }

  /**
   * Update stats
   */
  private updateStats(): void {
    this.stats = {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.stats.totalRequests,
      totalFailures: this.stats.totalFailures,
      totalSuccesses: this.stats.totalSuccesses,
    }
  }

  /**
   * Get current stats
   */
  getStats(): CircuitBreakerStats {
    return { ...this.stats }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * Reset circuit breaker to CLOSED state
   */
  reset(): void {
    this.transitionToClosed()
  }

  /**
   * Manually open the circuit breaker
   */
  open(): void {
    this.transitionToOpen()
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CircuitBreakerOpenError'
  }
}

// Create circuit breaker instance for OpenAI API
export const openaiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
  requestTimeout: 30000, // 30 seconds
  monitoringEnabled: true,
})

/**
 * Execute function through OpenAI circuit breaker
 */
export async function executeWithCircuitBreaker<T>(
  fn: () => Promise<T>
): Promise<T> {
  return openaiCircuitBreaker.execute(fn)
}

/**
 * Get OpenAI circuit breaker stats
 */
export function getOpenaiCircuitBreakerStats(): CircuitBreakerStats {
  return openaiCircuitBreaker.getStats()
}
