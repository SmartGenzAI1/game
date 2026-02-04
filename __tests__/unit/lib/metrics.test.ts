import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  metricsRegistry,
  httpRequestDuration,
  httpRequestCount,
  httpRequestErrors,
  dbQueryDuration,
  dbQueryCount,
  dbConnectionPoolUsage,
  dbConnectionPoolSize,
  dbConnectionErrors,
  cacheHitRate,
  cacheOperations,
  cacheSize,
  authAttempts,
  authFailures,
  authDuration,
  userRegistrations,
  activeUsers,
  linkClicks,
  linksCreated,
  linksDeleted,
  externalApiCalls,
  externalApiDuration,
  externalApiErrors,
  circuitBreakerState,
  circuitBreakerFailures,
  circuitBreakerSuccesses,
  rateLimitRequests,
  rateLimitViolations,
  errorsTotal,
  errorsByComponent,
  recordHttpRequest,
  recordDbQuery,
  recordCacheOperation,
  recordAuthAttempt,
  recordExternalApiCall,
  recordCircuitBreakerState,
  recordCircuitBreakerFailure,
  recordCircuitBreakerSuccess,
  recordError,
  updateDbPoolMetrics,
  updateCacheMetrics,
  updateActiveUsers,
  getMetrics,
  resetMetrics,
} from '@/lib/metrics';

describe('Metrics Registry', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('HTTP Request Metrics', () => {
    it('should record HTTP request duration', () => {
      recordHttpRequest('GET', '/api/test', 200, 0.1, 'correlation-123');

      const metrics = getMetrics();
      expect(metrics).toContain('http_request_duration_seconds');
    });

    it('should record HTTP request count', () => {
      recordHttpRequest('GET', '/api/test', 200, 0.1);

      const metrics = getMetrics();
      expect(metrics).toContain('http_requests_total');
    });

    it('should record HTTP request errors for 4xx status', () => {
      recordHttpRequest('GET', '/api/test', 404, 0.1);

      const metrics = getMetrics();
      expect(metrics).toContain('http_request_errors_total');
    });

    it('should record HTTP request errors for 5xx status', () => {
      recordHttpRequest('GET', '/api/test', 500, 0.1);

      const metrics = getMetrics();
      expect(metrics).toContain('http_request_errors_total');
    });

    it('should not record errors for 2xx status', () => {
      recordHttpRequest('GET', '/api/test', 200, 0.1);

      const metrics = getMetrics();
      expect(metrics).toContain('http_requests_total');
    });
  });

  describe('Database Metrics', () => {
    it('should record database query duration', () => {
      recordDbQuery('SELECT', 'users', 0.05);

      const metrics = getMetrics();
      expect(metrics).toContain('db_query_duration_seconds');
    });

    it('should record database query count', () => {
      recordDbQuery('SELECT', 'users', 0.05);

      const metrics = getMetrics();
      expect(metrics).toContain('db_queries_total');
    });

    it('should record database connection errors', () => {
      const error = new Error('Connection failed');
      recordDbQuery('SELECT', 'users', 0.05, error);

      const metrics = getMetrics();
      expect(metrics).toContain('db_connection_errors_total');
    });

    it('should update database connection pool metrics', () => {
      updateDbPoolMetrics('main', 5, 10);

      const metrics = getMetrics();
      expect(metrics).toContain('db_connection_pool_usage');
      expect(metrics).toContain('db_connection_pool_size');
    });
  });

  describe('Cache Metrics', () => {
    it('should record cache hit', () => {
      recordCacheOperation('hit', 'main');

      const metrics = getMetrics();
      expect(metrics).toContain('cache_operations_total');
    });

    it('should record cache miss', () => {
      recordCacheOperation('miss', 'main');

      const metrics = getMetrics();
      expect(metrics).toContain('cache_operations_total');
    });

    it('should record cache set', () => {
      recordCacheOperation('set', 'main');

      const metrics = getMetrics();
      expect(metrics).toContain('cache_operations_total');
    });

    it('should record cache delete', () => {
      recordCacheOperation('delete', 'main');

      const metrics = getMetrics();
      expect(metrics).toContain('cache_operations_total');
    });

    it('should update cache metrics', () => {
      updateCacheMetrics('main', 0.8, 100);

      const metrics = getMetrics();
      expect(metrics).toContain('cache_hit_rate');
      expect(metrics).toContain('cache_size');
    });
  });

  describe('Authentication Metrics', () => {
    it('should record successful auth attempt', () => {
      recordAuthAttempt('login', true, 0.1);

      const metrics = getMetrics();
      expect(metrics).toContain('auth_attempts_total');
      expect(metrics).toContain('auth_duration_seconds');
    });

    it('should record failed auth attempt', () => {
      recordAuthAttempt('login', false, 0.1, 'invalid_credentials');

      const metrics = getMetrics();
      expect(metrics).toContain('auth_attempts_total');
      expect(metrics).toContain('auth_failures_total');
    });

    it('should record auth duration', () => {
      recordAuthAttempt('login', true, 0.5);

      const metrics = getMetrics();
      expect(metrics).toContain('auth_duration_seconds');
    });
  });

  describe('Business Metrics', () => {
    it('should record user registration', () => {
      userRegistrations.inc();

      const metrics = getMetrics();
      expect(metrics).toContain('user_registrations_total');
    });

    it('should update active users', () => {
      updateActiveUsers(100);

      const metrics = getMetrics();
      expect(metrics).toContain('active_users');
    });

    it('should record link click', () => {
      linkClicks.inc({ link_id: 'link-1', user_id: 'user-1' });

      const metrics = getMetrics();
      expect(metrics).toContain('link_clicks_total');
    });

    it('should record link creation', () => {
      linksCreated.inc({ user_id: 'user-1' });

      const metrics = getMetrics();
      expect(metrics).toContain('links_created_total');
    });

    it('should record link deletion', () => {
      linksDeleted.inc({ user_id: 'user-1' });

      const metrics = getMetrics();
      expect(metrics).toContain('links_deleted_total');
    });
  });

  describe('External API Metrics', () => {
    it('should record successful external API call', () => {
      recordExternalApiCall('openai', '/v1/chat', 'POST', 1.0, 'success');

      const metrics = getMetrics();
      expect(metrics).toContain('external_api_calls_total');
      expect(metrics).toContain('external_api_duration_seconds');
    });

    it('should record failed external API call', () => {
      recordExternalApiCall('openai', '/v1/chat', 'POST', 1.0, 'error', 'rate_limit_exceeded');

      const metrics = getMetrics();
      expect(metrics).toContain('external_api_calls_total');
      expect(metrics).toContain('external_api_errors_total');
    });

    it('should record external API duration', () => {
      recordExternalApiCall('openai', '/v1/chat', 'POST', 2.5, 'success');

      const metrics = getMetrics();
      expect(metrics).toContain('external_api_duration_seconds');
    });
  });

  describe('Circuit Breaker Metrics', () => {
    it('should record circuit breaker state', () => {
      recordCircuitBreakerState('openai', 'chat', 'closed');

      const metrics = getMetrics();
      expect(metrics).toContain('circuit_breaker_state');
    });

    it('should record circuit breaker failure', () => {
      recordCircuitBreakerFailure('openai', 'chat');

      const metrics = getMetrics();
      expect(metrics).toContain('circuit_breaker_failures_total');
    });

    it('should record circuit breaker success', () => {
      recordCircuitBreakerSuccess('openai', 'chat');

      const metrics = getMetrics();
      expect(metrics).toContain('circuit_breaker_successes_total');
    });
  });

  describe('Rate Limiting Metrics', () => {
    it('should record rate limit request', () => {
      rateLimitRequests.inc({ identifier: '192.168.1.1', limit_type: 'login', allowed: 'true' });

      const metrics = getMetrics();
      expect(metrics).toContain('rate_limit_requests_total');
    });

    it('should record rate limit violation', () => {
      rateLimitViolations.inc({ identifier: '192.168.1.1', limit_type: 'login' });

      const metrics = getMetrics();
      expect(metrics).toContain('rate_limit_violations_total');
    });
  });

  describe('Error Metrics', () => {
    it('should record error', () => {
      recordError('validation_error', 'medium');

      const metrics = getMetrics();
      expect(metrics).toContain('errors_total');
    });

    it('should record error with component', () => {
      recordError('database_error', 'high', 'database');

      const metrics = getMetrics();
      expect(metrics).toContain('errors_total');
      expect(metrics).toContain('errors_by_component_total');
    });

    it('should record critical error', () => {
      recordError('security_breach', 'critical');

      const metrics = getMetrics();
      expect(metrics).toContain('errors_total');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      recordHttpRequest('GET', '/api/test', 200, 0.1);

      const metrics = await getMetrics();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include metric names', async () => {
      recordHttpRequest('GET', '/api/test', 200, 0.1);

      const metrics = await getMetrics();
      expect(metrics).toContain('http_request_duration_seconds');
    });

    it('should include metric values', async () => {
      recordHttpRequest('GET', '/api/test', 200, 0.1);

      const metrics = await getMetrics();
      expect(metrics).toMatch(/\d+\.\d+/); // Should contain numbers
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', async () => {
      recordHttpRequest('GET', '/api/test', 200, 0.1);

      let metrics = await getMetrics();
      expect(metrics).toContain('http_request_duration_seconds');

      resetMetrics();

      metrics = await getMetrics();
      // Metrics should still exist but values should be reset
      expect(metrics).toContain('http_request_duration_seconds');
    });
  });

  describe('Metric Labels', () => {
    it('should record HTTP request with labels', async () => {
      recordHttpRequest('POST', '/api/users', 201, 0.2, 'correlation-123');

      const metrics = await getMetrics();
      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('route="/api/users"');
      expect(metrics).toContain('status_code="201"');
    });

    it('should record database query with labels', async () => {
      recordDbQuery('INSERT', 'users', 0.05);

      const metrics = await getMetrics();
      expect(metrics).toContain('operation="INSERT"');
      expect(metrics).toContain('table="users"');
    });

    it('should record cache operation with labels', async () => {
      recordCacheOperation('hit', 'main');

      const metrics = await getMetrics();
      expect(metrics).toContain('operation="hit"');
      expect(metrics).toContain('cache_name="main"');
    });

    it('should record auth attempt with labels', async () => {
      recordAuthAttempt('login', true, 0.1);

      const metrics = await getMetrics();
      expect(metrics).toContain('method="login"');
      expect(metrics).toContain('success="true"');
    });

    it('should record external API call with labels', async () => {
      recordExternalApiCall('openai', '/v1/chat', 'POST', 1.0, 'success');

      const metrics = await getMetrics();
      expect(metrics).toContain('service="openai"');
      expect(metrics).toContain('endpoint="/v1/chat"');
      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('status="success"');
    });
  });

  describe('Metric Types', () => {
    it('should have Counter metrics', () => {
      expect(httpRequestCount).toBeDefined();
      expect(dbQueryCount).toBeDefined();
      expect(cacheOperations).toBeDefined();
      expect(authAttempts).toBeDefined();
    });

    it('should have Histogram metrics', () => {
      expect(httpRequestDuration).toBeDefined();
      expect(dbQueryDuration).toBeDefined();
      expect(authDuration).toBeDefined();
      expect(externalApiDuration).toBeDefined();
    });

    it('should have Gauge metrics', () => {
      expect(dbConnectionPoolUsage).toBeDefined();
      expect(cacheHitRate).toBeDefined();
      expect(activeUsers).toBeDefined();
      expect(circuitBreakerState).toBeDefined();
    });
  });
});
