# Logging, Monitoring & Observability Documentation

## Overview

This document describes the comprehensive logging, monitoring, and observability features implemented in Phase 4 of the production readiness initiative. These features provide deep visibility into application behavior, performance, and health, enabling proactive issue detection and rapid troubleshooting.

## Table of Contents

1. [Structured Logging](#structured-logging)
2. [Health Check Endpoints](#health-check-endpoints)
3. [Metrics Collection](#metrics-collection)
4. [Graceful Shutdown](#graceful-shutdown)
5. [Distributed Tracing](#distributed-tracing)
6. [Error Tracking](#error-tracking)
7. [Observability Dashboard](#observability-dashboard)
8. [Setup Instructions](#setup-instructions)
9. [Alert Configuration](#alert-configuration)
10. [Best Practices](#best-practices)

---

## Structured Logging

### Implementation

The application uses **Pino** for high-performance structured logging with correlation IDs for request tracing.

#### Logger Location
- **File**: [`lib/logger.ts`](lib/logger.ts)

#### Key Features

1. **Correlation IDs**: Every request gets a unique correlation ID for end-to-end tracing
2. **Log Levels**: debug, info, warn, error
3. **Sensitive Data Redaction**: Automatically redacts passwords, tokens, secrets, API keys
4. **Structured Context**: Rich context including userId, requestId, path, method, userAgent, IP
5. **Specialized Logging Methods**:
   - `logRequest()` - HTTP request/response logging
   - `logDatabase()` - Database operation logging
   - `logAuth()` - Authentication event logging
   - `logApiCall()` - External API call logging
   - `logCache()` - Cache operation logging
   - `logBusiness()` - Business event logging
   - `logPerformance()` - Performance metric logging
   - `logSecurity()` - Security event logging

#### Log Format

```json
{
  "level": "info",
  "time": "2024-01-30T12:00:00.000Z",
  "correlationId": "1706625600000-abc123def456",
  "userId": "user_123",
  "requestId": "1706625600000-abc123def456",
  "path": "/api/links",
  "method": "POST",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.1",
  "msg": "Link created successfully",
  "linkId": "link_456",
  "duration": 0.234
}
```

#### Usage Examples

```typescript
import { logger, createLoggerFromRequest } from '@/lib/logger';

// Basic logging
logger.info('Application started');

// With correlation ID
const log = createLoggerFromRequest(request);
log.info('Processing request', { userId: '123' });

// Specialized logging
log.logAuth('login', 'user_123', true);
log.logDatabase('SELECT', 'users', 0.045);
log.logApiCall('openai', '/v1/chat/completions', 'POST', 1.234);
```

#### Environment Variables

```bash
# Log level (default: info in production, debug in development)
LOG_LEVEL=debug

# Enable/disable metrics endpoint (default: true)
ENABLE_METRICS=true
```

#### Sensitive Data Redaction

The following patterns are automatically redacted from logs:
- `password`, `token`, `secret`
- `api_key`, `apiKey`, `api-key`
- `authorization`, `cookie`, `session`
- `credit_card`, `creditCard`, `ssn`, `pin`

---

## Health Check Endpoints

### Implementation

Health check endpoints provide visibility into application and component health for monitoring systems and load balancers.

#### Endpoints

| Endpoint | Purpose | Response Time |
|----------|---------|---------------|
| `GET /health` | Comprehensive health check | < 5s |
| `HEAD /health` | Lightweight health check | < 100ms |
| `GET /health/ready` | Readiness probe | < 2s |
| `GET /health/live` | Liveness probe | < 100ms |

#### Files
- [`app/api/health/route.ts`](app/api/health/route.ts) - Main health endpoint
- [`app/api/health/ready/route.ts`](app/api/health/ready/route.ts) - Readiness probe
- [`app/api/health/live/route.ts`](app/api/health/live/route.ts) - Liveness probe

### GET /health

Returns comprehensive health status with component breakdown.

#### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-01-30T12:00:00.000Z",
  "uptime": 86400,
  "version": "0.1.0",
  "environment": "production",
  "components": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful",
      "responseTime": 45
    },
    "cache": {
      "status": "healthy",
      "message": "Cache operational",
      "responseTime": 12
    },
    "openai": {
      "status": "healthy",
      "message": "OpenAI API operational",
      "responseTime": 234
    },
    "circuitBreaker": {
      "status": "healthy",
      "message": "Circuit breaker state: closed",
      "responseTime": 5,
      "details": "closed"
    }
  },
  "checks": [
    {
      "name": "database",
      "status": "pass",
      "output": "Database connection successful",
      "responseTime": 45
    },
    {
      "name": "cache",
      "status": "pass",
      "output": "Cache operational",
      "responseTime": 12
    },
    {
      "name": "openai",
      "status": "pass",
      "output": "OpenAI API operational",
      "responseTime": 234
    },
    {
      "name": "circuitBreaker",
      "status": "pass",
      "output": "Circuit breaker state: closed",
      "responseTime": 5
    }
  ]
}
```

#### Status Codes
- `200` - Healthy or degraded
- `503` - Unhealthy

### GET /health/ready

Readiness probe - checks if the application is ready to accept traffic.

#### Response Format

```json
{
  "status": "ready",
  "timestamp": "2024-01-30T12:00:00.000Z",
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database connected"
    },
    "cache": {
      "status": "pass",
      "message": "Cache operational"
    }
  }
}
```

#### Status Codes
- `200` - Ready
- `503` - Not ready

### GET /health/live

Liveness probe - checks if the application process is running.

#### Response Format

```json
{
  "status": "alive",
  "timestamp": "2024-01-30T12:00:00.000Z",
  "uptime": 86400,
  "pid": 12345,
  "memory": {
    "rss": 134217728,
    "heapTotal": 67108864,
    "heapUsed": 33554432,
    "external": 2097152
  }
}
```

#### Status Codes
- `200` - Alive
- `503` - Dead

---

## Metrics Collection

### Implementation

The application uses **prom-client** for Prometheus-compatible metrics collection.

#### Metrics Location
- **File**: [`lib/metrics.ts`](lib/metrics.ts)
- **Endpoint**: [`app/api/metrics/route.ts`](app/api/metrics/route.ts)

### Metrics Categories

#### 1. HTTP Request Metrics

| Metric | Type | Labels | Description |
|---------|------|---------|-------------|
| `http_request_duration_seconds` | Histogram | method, route, status_code, correlation_id | Duration of HTTP requests |
| `http_requests_total` | Counter | method, route, status_code | Total number of HTTP requests |
| `http_request_errors_total` | Counter | method, route, error_type | Total number of HTTP request errors |

#### 2. Database Metrics

| Metric | Type | Labels | Description |
|---------|------|---------|-------------|
| `db_query_duration_seconds` | Histogram | operation, table, error | Duration of database queries |
| `db_queries_total` | Counter | operation, table | Total number of database queries |
| `db_connection_pool_usage` | Gauge | pool_name | Database connection pool usage (0-1) |
| `db_connection_pool_size` | Gauge | pool_name | Database connection pool size |
| `db_connection_errors_total` | Counter | error_type | Total number of database connection errors |

#### 3. Cache Metrics

| Metric | Type | Labels | Description |
|---------|------|---------|-------------|
| `cache_hit_rate` | Gauge | cache_name | Cache hit rate percentage |
| `cache_operations_total` | Counter | operation, cache_name | Total number of cache operations |
| `cache_size` | Gauge | cache_name | Current cache size |

#### 4. Authentication Metrics

| Metric | Type | Labels | Description |
|---------|------|---------|-------------|
| `auth_attempts_total` | Counter | method, success | Total number of authentication attempts |
| `auth_failures_total` | Counter | method, failure_reason | Total number of authentication failures |
| `auth_duration_seconds` | Histogram | method, success | Duration of authentication operations |

#### 5. Business Metrics

| Metric | Type | Labels | Description |
|---------|------|---------|-------------|
| `user_registrations_total` | Counter | - | Total number of user registrations |
| `active_users` | Gauge | - | Number of active users |
| `link_clicks_total` | Counter | link_id, user_id | Total number of link clicks |
| `links_created_total` | Counter | user_id | Total number of links created |
| `links_deleted_total` | Counter | user_id | Total number of links deleted |

#### 6. External API Metrics

| Metric | Type | Labels | Description |
|---------|------|---------|-------------|
| `external_api_calls_total` | Counter | service, endpoint, method, status | Total number of external API calls |
| `external_api_duration_seconds` | Histogram | service, endpoint, method | Duration of external API calls |
| `external_api_errors_total` | Counter | service, endpoint, error_type | Total number of external API errors |

#### 7. Circuit Breaker Metrics

| Metric | Type | Labels | Description |
|---------|------|---------|-------------|
| `circuit_breaker_state` | Gauge | service, operation | Circuit breaker state (0=closed, 1=open, 2=half-open) |
| `circuit_breaker_failures_total` | Counter | service, operation | Total number of circuit breaker failures |
| `circuit_breaker_successes_total` | Counter | service, operation | Total number of circuit breaker successes |

#### 8. Rate Limiting Metrics

| Metric | Type | Labels | Description |
|---------|------|---------|-------------|
| `rate_limit_requests_total` | Counter | identifier, limit_type, allowed | Total number of rate limit checks |
| `rate_limit_violations_total` | Counter | identifier, limit_type | Total number of rate limit violations |

#### 9. Error Metrics

| Metric | Type | Labels | Description |
|---------|------|---------|-------------|
| `errors_total` | Counter | error_type, severity | Total number of errors |
| `errors_by_component_total` | Counter | component, error_type | Total number of errors by component |

### GET /metrics

Returns all metrics in Prometheus format for scraping.

#### Example Output

```
# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/health",status_code="200",correlation_id="unknown",le="0.005"} 1
http_request_duration_seconds_bucket{method="GET",route="/api/health",status_code="200",correlation_id="unknown",le="0.01"} 1
http_request_duration_seconds_bucket{method="GET",route="/api/health",status_code="200",correlation_id="unknown",le="+Inf"} 1
http_request_duration_seconds_sum{method="GET",route="/api/health",status_code="200",correlation_id="unknown"} 0.023
http_request_duration_seconds_count{method="GET",route="/api/health",status_code="200",correlation_id="unknown"} 1

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/health",status_code="200"} 1

# HELP user_registrations_total Total number of user registrations
# TYPE user_registrations_total counter
user_registrations_total 42
```

#### Usage

```bash
# Scrape metrics
curl http://localhost:3000/metrics

# Check if metrics endpoint is available
curl -I http://localhost:3000/metrics
```

---

## Graceful Shutdown

### Implementation

Graceful shutdown handling ensures clean termination of the application, completing in-flight requests and releasing resources properly.

#### Shutdown Location
- **File**: [`lib/shutdown.ts`](lib/shutdown.ts)

### Features

1. **Signal Handling**: Handles SIGTERM and SIGINT signals
2. **Database Cleanup**: Properly closes database connections
3. **Cache Flush**: Flushes pending cache operations
4. **Log Flush**: Ensures all logs are written
5. **In-Flight Requests**: Waits for in-flight requests to complete
6. **Connection Pool Drain**: Drains connection pools
7. **Timeout Configuration**: Configurable shutdown timeout (default: 30s)

### Shutdown Process

1. **Stop accepting new requests** (handled by Next.js)
2. **Complete in-flight requests** (15s timeout)
3. **Drain connection pools**
4. **Flush pending logs**
5. **Close database connections**
6. **Exit with appropriate code**

### Usage

```typescript
import { setupGracefulShutdown, registerShutdownHandler } from '@/lib/shutdown';

// Setup default graceful shutdown
setupGracefulShutdown();

// Register custom shutdown handler
registerShutdownHandler({
  name: 'custom-service',
  timeout: 5000,
  handler: async (signal) => {
    console.log('Cleaning up custom service...');
    // Cleanup logic
  }
});
```

### Shutdown Handlers

Default handlers are automatically registered:
- **database**: Closes Prisma connections (10s timeout)
- **cache**: Flushes cache (5s timeout)
- **http-server**: Stops HTTP server (15s timeout)

### Environment Variables

```bash
# Shutdown timeout in milliseconds (default: 30000)
SHUTDOWN_TIMEOUT=30000
```

---

## Distributed Tracing

### Implementation

Distributed tracing is implemented using correlation IDs that propagate across all requests and operations.

#### Correlation ID Flow

1. **Request Ingress**: Correlation ID extracted from headers or generated
2. **Middleware**: Added to request context and response headers
3. **Logger**: Included in all log entries
4. **Metrics**: Tracked in HTTP request metrics
5. **Database Operations**: Logged with correlation ID
6. **External API Calls**: Traced with correlation ID

### Correlation ID Headers

The following headers are checked for correlation IDs (in order):
- `X-Correlation-ID`
- `X-Request-ID`
- `Request-ID`

If none found, a new correlation ID is generated.

### Usage

```typescript
import { createCorrelationId, extractCorrelationId, createLoggerFromRequest } from '@/lib/logger';

// Extract from headers
const correlationId = extractCorrelationId(request.headers);

// Create new
const correlationId = createCorrelationId();

// Create logger with correlation ID
const logger = createLoggerFromRequest(request);
logger.info('Processing request');
```

### Trace Context

All log entries include:
- `correlationId`: Unique request identifier
- `requestId`: Alias for correlation ID
- `userId`: User ID if authenticated
- `path`: Request path
- `method`: HTTP method
- `userAgent`: User agent string
- `ip`: Client IP address

---

## Error Tracking

### Implementation

Comprehensive error tracking with context capture and aggregation.

#### Error Tracking Features

1. **Stack Trace Capture**: Full stack traces for all errors
2. **Error Context**: User, request, and environment information
3. **Error Aggregation**: Group similar errors
4. **Error Rate Monitoring**: Track error rates over time
5. **Severity Levels**: low, medium, high, critical

### Error Metrics

Errors are tracked with the following metrics:
- `errors_total` - Total errors by type and severity
- `errors_by_component_total` - Errors by component

### Error Logging

```typescript
import { logger } from '@/lib/logger';
import { recordError } from '@/lib/metrics';

// Log error with context
logger.error('Operation failed', error, {
  userId: '123',
  operation: 'createLink',
  duration: 0.234
});

// Record error metric
recordError('database_connection_failed', 'high', 'database');
```

### Error Severity Levels

| Severity | Description | Example |
|----------|-------------|----------|
| `low` | Minor issues that don't affect functionality | Deprecated API usage |
| `medium` | Issues that partially affect functionality | Slow database query |
| `high` | Issues that significantly affect functionality | Database connection failure |
| `critical` | Issues that completely break functionality | Application crash |

---

## Observability Dashboard

### Key Performance Indicators (KPIs)

#### 1. Application Health
- **Health Status**: Overall application health (healthy/degraded/unhealthy)
- **Uptime**: Application uptime percentage
- **Response Time**: Average response time (p50, p95, p99)
- **Error Rate**: Percentage of requests resulting in errors

#### 2. Database Performance
- **Connection Pool Usage**: Percentage of connections in use
- **Query Duration**: Average query execution time
- **Query Count**: Number of queries per second
- **Connection Errors**: Number of connection failures

#### 3. Cache Performance
- **Hit Rate**: Percentage of cache hits
- **Cache Size**: Current cache size
- **Operations**: Number of cache operations per second

#### 4. Authentication
- **Login Success Rate**: Percentage of successful logins
- **Login Duration**: Average login time
- **Failed Attempts**: Number of failed login attempts

#### 5. Business Metrics
- **User Registrations**: New user registrations per day
- **Active Users**: Number of active users
- **Link Clicks**: Number of link clicks per day
- **Links Created**: Number of links created per day

### Alert Thresholds

#### Critical Alerts
- Health status: `unhealthy`
- Error rate: `> 5%`
- Response time (p95): `> 2s`
- Database connection errors: `> 10/min`
- Circuit breaker state: `open`

#### Warning Alerts
- Health status: `degraded`
- Error rate: `> 1%`
- Response time (p95): `> 1s`
- Cache hit rate: `< 70%`
- Database query duration (p95): `> 500ms`

#### Info Alerts
- High traffic volume
- New user registration spike
- Unusual error patterns

---

## Setup Instructions

### 1. Prometheus Setup

#### Install Prometheus

```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.47.0/prometheus-2.47.0.linux-amd64.tar.gz
tar xvfz prometheus-2.47.0.linux-amd64.tar.gz
cd prometheus-2.47.0.linux-amd64
```

#### Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'nextjs-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

#### Start Prometheus

```bash
./prometheus --config.file=prometheus.yml
```

Access Prometheus at: `http://localhost:9090`

### 2. Grafana Setup

#### Install Grafana

```bash
# Using Docker
docker run -d -p 3000:3000 --name=grafana grafana/grafana

# Or download from https://grafana.com/grafana/download
```

#### Add Prometheus Data Source

1. Login to Grafana (default: admin/admin)
2. Go to Configuration > Data Sources
3. Add Prometheus data source
4. URL: `http://localhost:9090`
5. Click "Save & Test"

#### Import Dashboard

Create a new dashboard with the following panels:

**Panel 1: Application Health**
- Query: `up{job="nextjs-app"}`
- Type: Stat
- Title: Application Status

**Panel 2: Request Rate**
- Query: `rate(http_requests_total[5m])`
- Type: Graph
- Title: Requests per Second

**Panel 3: Error Rate**
- Query: `rate(http_request_errors_total[5m])`
- Type: Graph
- Title: Errors per Second

**Panel 4: Response Time**
- Query: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
- Type: Graph
- Title: P95 Response Time

**Panel 5: Database Query Duration**
- Query: `histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))`
- Type: Graph
- Title: P95 Query Duration

**Panel 6: Cache Hit Rate**
- Query: `cache_hit_rate`
- Type: Gauge
- Title: Cache Hit Rate

**Panel 7: User Registrations**
- Query: `rate(user_registrations_total[1h])`
- Type: Graph
- Title: Registrations per Hour

**Panel 8: Link Clicks**
- Query: `rate(link_clicks_total[1h])`
- Type: Graph
- Title: Clicks per Hour

### 3. Log Aggregation (Optional)

#### Loki Setup

```bash
# Using Docker
docker run -d -p 3100:3100 --name=loki grafana/loki
```

#### Configure Loki

Create `loki-config.yml`:

```yaml
server:
  http_listen_port: 3100

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: nextjs-app
    static_configs:
      - targets:
          - localhost
        labels:
          job: nextjs-app
          __path__: /var/log/nextjs/*.log
```

#### Configure Pino to Send to Loki

```typescript
import pino from 'pino';
import { multistream } from 'pino-multi-stream';

const streams = [
  { level: 'info', stream: process.stdout },
  { level: 'info', stream: pino.transport({ target: 'pino-loki', options: { host: 'localhost', port: 3100 } }) }
];

export const logger = pino({}, multistream(streams));
```

### 4. Alerting Setup

#### Prometheus Alert Rules

Create `alert-rules.yml`:

```yaml
groups:
  - name: nextjs-app
    rules:
      - alert: ApplicationDown
        expr: up{job="nextjs-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Application is down"
          description: "Application {{ $labels.instance }} has been down for more than 1 minute."

      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate"
          description: "Error rate is {{ $value }} errors per second"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time"
          description: "P95 response time is {{ $value }} seconds"

      - alert: DatabaseConnectionErrors
        expr: rate(db_connection_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection errors"
          description: "Database connection error rate is {{ $value }} per second"

      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state{service="openai"} == 1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Circuit breaker is open"
          description: "Circuit breaker for {{ $labels.service }} is open"
```

#### Configure Prometheus to Use Alert Rules

Update `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'alert-rules.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

scrape_configs:
  - job_name: 'nextjs-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

#### Alertmanager Setup

```bash
# Using Docker
docker run -d -p 9093:9093 --name=alertmanager prom/alertmanager
```

Configure `alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'alerts@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alertmanager@example.com'
        auth_password: 'password'
```

---

## Alert Configuration Examples

### Email Alerts

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'team@example.com'
        from: 'alerts@example.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@example.com'
        auth_password: 'password'
        headers:
          Subject: '[ALERT] {{ .GroupLabels.alertname }}'
```

### Slack Alerts

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: '[ALERT] {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

### PagerDuty Alerts

```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ .GroupLabels.alertname }}'
        severity: '{{ .GroupLabels.severity }}'
```

---

## Best Practices

### Logging

1. **Use Appropriate Log Levels**
   - `debug`: Detailed diagnostic information
   - `info`: General informational messages
   - `warn`: Warning messages for potentially harmful situations
   - `error`: Error events that might still allow the application to continue

2. **Include Context**
   - Always include correlation ID
   - Add relevant context (userId, requestId, etc.)
   - Include duration for operations

3. **Avoid Sensitive Data**
   - Never log passwords, tokens, or secrets
   - Use the built-in redaction feature
   - Sanitize user input before logging

4. **Structured Logging**
   - Use structured logging (JSON format)
   - Include key-value pairs for context
   - Avoid string concatenation

### Metrics

1. **Choose Appropriate Metric Types**
   - Counter: Monotonically increasing values
   - Gauge: Values that can go up or down
   - Histogram: Distributions of values (latency, request sizes)
   - Summary: Similar to histogram but with configurable quantiles

2. **Use Meaningful Labels**
   - Keep label cardinality low
   - Use consistent label names
   - Avoid high-cardinality labels (user IDs, timestamps)

3. **Track Business Metrics**
   - Monitor user registrations
   - Track link clicks
   - Measure active users
   - Monitor conversion rates

### Health Checks

1. **Keep Health Checks Fast**
   - Main health check: < 5s
   - Readiness probe: < 2s
   - Liveness probe: < 100ms

2. **Check Critical Components**
   - Database connectivity
   - Cache availability
   - External service availability
   - Circuit breaker state

3. **Return Appropriate Status Codes**
   - 200: Healthy or degraded
   - 503: Unhealthy

### Alerting

1. **Set Meaningful Thresholds**
   - Base thresholds on historical data
   - Avoid alert fatigue
   - Use severity levels appropriately

2. **Provide Context in Alerts**
   - Include what happened
   - Explain why it matters
   - Suggest next steps

3. **Test Alert Rules**
   - Verify alerts fire when expected
   - Test notification delivery
   - Review and adjust thresholds regularly

### Distributed Tracing

1. **Propagate Correlation IDs**
   - Always include correlation ID in logs
   - Pass correlation ID to external services
   - Include in response headers

2. **Trace Critical Paths**
   - User authentication flows
   - Database operations
   - External API calls
   - Business transactions

3. **Analyze Traces**
   - Identify bottlenecks
   - Find slow operations
   - Optimize critical paths

---

## Troubleshooting

### Logs Not Appearing

1. Check log level: `LOG_LEVEL=debug`
2. Verify logger initialization
3. Check log output destination
4. Ensure correlation IDs are being generated

### Metrics Not Updating

1. Verify metrics endpoint is accessible: `curl http://localhost:3000/metrics`
2. Check `ENABLE_METRICS=true`
3. Verify Prometheus is scraping correctly
4. Check Prometheus configuration

### Health Checks Failing

1. Check database connectivity
2. Verify cache is operational
3. Check external service availability
4. Review health check logs

### High Memory Usage

1. Check cache size: `cache_size` metric
2. Review connection pool usage: `db_connection_pool_usage`
3. Analyze memory metrics: `node_heap_size_*`
4. Check for memory leaks

### Slow Response Times

1. Review P95 response time: `http_request_duration_seconds`
2. Check database query duration: `db_query_duration_seconds`
3. Analyze external API calls: `external_api_duration_seconds`
4. Review circuit breaker state: `circuit_breaker_state`

---

## Summary

This implementation provides comprehensive logging, monitoring, and observability features:

✅ **Structured Logging** with correlation IDs and sensitive data redaction
✅ **Health Check Endpoints** for monitoring and load balancer integration
✅ **Metrics Collection** with Prometheus-compatible format
✅ **Graceful Shutdown** handling for clean termination
✅ **Distributed Tracing** with correlation ID propagation
✅ **Error Tracking** with context capture and aggregation
✅ **Observability Dashboard** with KPIs and alert thresholds

All features are production-ready and follow industry best practices for observability in modern web applications.
