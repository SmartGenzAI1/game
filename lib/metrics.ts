import { Registry, Counter, Histogram, Gauge, Summary, collectDefaultMetrics } from 'prom-client';

/**
 * Metrics Registry
 */
export const metricsRegistry = new Registry();

// Collect default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ 
  register: metricsRegistry,
  prefix: 'node_',
});

/**
 * HTTP Request Metrics
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'correlation_id'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export const httpRequestCount = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [metricsRegistry],
});

export const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type'] as const,
  registers: [metricsRegistry],
});

/**
 * Database Metrics
 */
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table', 'error'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

export const dbQueryCount = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table'] as const,
  registers: [metricsRegistry],
});

export const dbConnectionPoolUsage = new Gauge({
  name: 'db_connection_pool_usage',
  help: 'Database connection pool usage',
  labelNames: ['pool_name'] as const,
  registers: [metricsRegistry],
});

export const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['pool_name'] as const,
  registers: [metricsRegistry],
});

export const dbConnectionErrors = new Counter({
  name: 'db_connection_errors_total',
  help: 'Total number of database connection errors',
  labelNames: ['error_type'] as const,
  registers: [metricsRegistry],
});

/**
 * Cache Metrics
 */
export const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_name'] as const,
  registers: [metricsRegistry],
});

export const cacheOperations = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'cache_name'] as const,
  registers: [metricsRegistry],
});

export const cacheSize = new Gauge({
  name: 'cache_size',
  help: 'Current cache size',
  labelNames: ['cache_name'] as const,
  registers: [metricsRegistry],
});

/**
 * Authentication Metrics
 */
export const authAttempts = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'success'] as const,
  registers: [metricsRegistry],
});

export const authFailures = new Counter({
  name: 'auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['method', 'failure_reason'] as const,
  registers: [metricsRegistry],
});

export const authDuration = new Histogram({
  name: 'auth_duration_seconds',
  help: 'Duration of authentication operations in seconds',
  labelNames: ['method', 'success'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

/**
 * Business Metrics
 */
export const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  registers: [metricsRegistry],
});

export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users',
  registers: [metricsRegistry],
});

export const linkClicks = new Counter({
  name: 'link_clicks_total',
  help: 'Total number of link clicks',
  labelNames: ['link_id', 'user_id'] as const,
  registers: [metricsRegistry],
});

export const linksCreated = new Counter({
  name: 'links_created_total',
  help: 'Total number of links created',
  labelNames: ['user_id'] as const,
  registers: [metricsRegistry],
});

export const linksDeleted = new Counter({
  name: 'links_deleted_total',
  help: 'Total number of links deleted',
  labelNames: ['user_id'] as const,
  registers: [metricsRegistry],
});

/**
 * External API Metrics
 */
export const externalApiCalls = new Counter({
  name: 'external_api_calls_total',
  help: 'Total number of external API calls',
  labelNames: ['service', 'endpoint', 'method', 'status'] as const,
  registers: [metricsRegistry],
});

export const externalApiDuration = new Histogram({
  name: 'external_api_duration_seconds',
  help: 'Duration of external API calls in seconds',
  labelNames: ['service', 'endpoint', 'method'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [metricsRegistry],
});

export const externalApiErrors = new Counter({
  name: 'external_api_errors_total',
  help: 'Total number of external API errors',
  labelNames: ['service', 'endpoint', 'error_type'] as const,
  registers: [metricsRegistry],
});

/**
 * Circuit Breaker Metrics
 */
export const circuitBreakerState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['service', 'operation'] as const,
  registers: [metricsRegistry],
});

export const circuitBreakerFailures = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total number of circuit breaker failures',
  labelNames: ['service', 'operation'] as const,
  registers: [metricsRegistry],
});

export const circuitBreakerSuccesses = new Counter({
  name: 'circuit_breaker_successes_total',
  help: 'Total number of circuit breaker successes',
  labelNames: ['service', 'operation'] as const,
  registers: [metricsRegistry],
});

/**
 * Rate Limiting Metrics
 */
export const rateLimitRequests = new Counter({
  name: 'rate_limit_requests_total',
  help: 'Total number of rate limit checks',
  labelNames: ['identifier', 'limit_type', 'allowed'] as const,
  registers: [metricsRegistry],
});

export const rateLimitViolations = new Counter({
  name: 'rate_limit_violations_total',
  help: 'Total number of rate limit violations',
  labelNames: ['identifier', 'limit_type'] as const,
  registers: [metricsRegistry],
});

/**
 * Error Metrics
 */
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'severity'] as const,
  registers: [metricsRegistry],
});

export const errorsByComponent = new Counter({
  name: 'errors_by_component_total',
  help: 'Total number of errors by component',
  labelNames: ['component', 'error_type'] as const,
  registers: [metricsRegistry],
});

/**
 * Metrics Helper Functions
 */

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number,
  correlationId?: string
): void {
  httpRequestDuration.observe(
    { method, route, status_code: statusCode, correlation_id: correlationId || 'unknown' },
    duration
  );
  httpRequestCount.inc({ method, route, status_code: statusCode });

  if (statusCode >= 400) {
    const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
    httpRequestErrors.inc({ method, route, error_type: errorType });
  }
}

/**
 * Record database query metrics
 */
export function recordDbQuery(
  operation: string,
  table: string,
  duration: number,
  error?: Error
): void {
  dbQueryDuration.observe({ operation, table, error: error ? 'true' : 'false' }, duration);
  dbQueryCount.inc({ operation, table });

  if (error) {
    dbConnectionErrors.inc({ error_type: error.name });
  }
}

/**
 * Record cache operation metrics
 */
export function recordCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  cacheName: string
): void {
  cacheOperations.inc({ operation, cache_name: cacheName });
}

/**
 * Record authentication metrics
 */
export function recordAuthAttempt(
  method: string,
  success: boolean,
  duration: number,
  failureReason?: string
): void {
  authAttempts.inc({ method, success: success.toString() });
  authDuration.observe({ method, success: success.toString() }, duration);

  if (!success && failureReason) {
    authFailures.inc({ method, failure_reason: failureReason });
  }
}

/**
 * Record external API call metrics
 */
export function recordExternalApiCall(
  service: string,
  endpoint: string,
  method: string,
  duration: number,
  status: 'success' | 'error',
  errorType?: string
): void {
  externalApiCalls.inc({ service, endpoint, method, status });
  externalApiDuration.observe({ service, endpoint, method }, duration);

  if (status === 'error' && errorType) {
    externalApiErrors.inc({ service, endpoint, error_type: errorType });
  }
}

/**
 * Record circuit breaker metrics
 */
export function recordCircuitBreakerState(
  service: string,
  operation: string,
  state: 'closed' | 'open' | 'half-open'
): void {
  const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
  circuitBreakerState.set({ service, operation }, stateValue);
}

export function recordCircuitBreakerFailure(service: string, operation: string): void {
  circuitBreakerFailures.inc({ service, operation });
}

export function recordCircuitBreakerSuccess(service: string, operation: string): void {
  circuitBreakerSuccesses.inc({ service, operation });
}

/**
 * Record error metrics
 */
export function recordError(errorType: string, severity: 'low' | 'medium' | 'high' | 'critical', component?: string): void {
  errorsTotal.inc({ error_type: errorType, severity });
  
  if (component) {
    errorsByComponent.inc({ component, error_type: errorType });
  }
}

/**
 * Update database connection pool metrics
 */
export function updateDbPoolMetrics(poolName: string, used: number, total: number): void {
  dbConnectionPoolUsage.set({ pool_name: poolName }, used / total);
  dbConnectionPoolSize.set({ pool_name: poolName }, total);
}

/**
 * Update cache metrics
 */
export function updateCacheMetrics(cacheName: string, hitRate: number, size: number): void {
  cacheHitRate.set({ cache_name: cacheName }, hitRate);
  cacheSize.set({ cache_name: cacheName }, size);
}

/**
 * Update active users metric
 */
export function updateActiveUsers(count: number): void {
  activeUsers.set(count);
}

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return await metricsRegistry.metrics();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  metricsRegistry.resetMetrics();
}

/**
 * Metrics middleware for Next.js API routes
 */
export function createMetricsMiddleware() {
  return async (request: Request, response: Response) => {
    const start = Date.now();
    const method = request.method;
    const url = new URL(request.url);
    const route = url.pathname;

    // Extract correlation ID from headers
    const correlationId = request.headers.get('x-correlation-id') || 
                         request.headers.get('x-request-id') || 
                         undefined;

    // Record metrics after response
    const originalJson = response.json;
    response.json = async function(data: any) {
      const duration = (Date.now() - start) / 1000;
      recordHttpRequest(method, route, response.status, duration, correlationId);
      return originalJson.call(this, data);
    };

    return response;
  };
}
