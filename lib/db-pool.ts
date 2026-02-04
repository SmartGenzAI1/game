/**
 * Database Connection Pool Configuration
 * 
 * This module provides optimized connection pool settings for PostgreSQL.
 * Connection pooling improves performance by reusing database connections
 * instead of creating a new connection for each query.
 */

export interface ConnectionPoolConfig {
  // Minimum number of connections to keep in the pool
  minConnections: number
  
  // Maximum number of connections in the pool
  maxConnections: number
  
  // Maximum time (in seconds) a connection can be idle before being closed
  connectionTimeout: number
  
  // Maximum time (in seconds) to wait for a connection from the pool
  poolTimeout: number
  
  // Enable query logging in development
  logQueries: boolean
}

/**
 * Get connection pool configuration based on environment
 */
export function getConnectionPoolConfig(): ConnectionPoolConfig {
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Environment-specific pool sizes
  if (isProduction) {
    // Production: Larger pool for higher concurrency
    return {
      minConnections: parseInt(process.env.DB_POOL_MIN || '5', 10),
      maxConnections: parseInt(process.env.DB_POOL_MAX || '20', 10),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30', 10),
      poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '10', 10),
      logQueries: false,
    }
  }
  
  if (isDevelopment) {
    // Development: Smaller pool, query logging enabled
    return {
      minConnections: 2,
      maxConnections: 10,
      connectionTimeout: 30,
      poolTimeout: 10,
      logQueries: true,
    }
  }
  
  // Test: Minimal pool
  return {
    minConnections: 1,
    maxConnections: 5,
    connectionTimeout: 30,
    poolTimeout: 10,
    logQueries: false,
  }
}

/**
 * Validate connection pool configuration
 */
export function validatePoolConfig(config: ConnectionPoolConfig): boolean {
  if (config.minConnections < 0) {
    console.error('DB_POOL_MIN must be >= 0')
    return false
  }
  
  if (config.maxConnections < config.minConnections) {
    console.error('DB_POOL_MAX must be >= DB_POOL_MIN')
    return false
  }
  
  if (config.maxConnections > 100) {
    console.warn('DB_POOL_MAX > 100 may cause performance issues')
  }
  
  if (config.connectionTimeout < 1) {
    console.error('DB_CONNECTION_TIMEOUT must be >= 1 second')
    return false
  }
  
  if (config.poolTimeout < 1) {
    console.error('DB_POOL_TIMEOUT must be >= 1 second')
    return false
  }
  
  return true
}

/**
 * Get Prisma connection URL with pool parameters
 */
export function getPrismaConnectionUrl(): string {
  const baseUrl = process.env.DATABASE_URL
  
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  
  const config = getConnectionPoolConfig()
  
  // Parse existing URL and add pool parameters
  const url = new URL(baseUrl)
  
  // Add connection pool parameters
  url.searchParams.set('connection_limit', config.maxConnections.toString())
  url.searchParams.set('pool_timeout', config.poolTimeout.toString())
  
  return url.toString()
}

/**
 * Database health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean
  interval: number // seconds between health checks
  timeout: number // seconds before health check fails
  retries: number // number of retries before marking as unhealthy
}

/**
 * Get health check configuration
 */
export function getHealthCheckConfig(): HealthCheckConfig {
  return {
    enabled: process.env.DB_HEALTH_CHECK_ENABLED !== 'false',
    interval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '60', 10),
    timeout: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT || '5', 10),
    retries: parseInt(process.env.DB_HEALTH_CHECK_RETRIES || '3', 10),
  }
}

/**
 * Connection pool statistics interface
 */
export interface PoolStats {
  activeConnections: number
  idleConnections: number
  totalConnections: number
  waitingRequests: number
}

/**
 * Get connection pool statistics (placeholder - implement with actual monitoring)
 */
export async function getPoolStats(): Promise<PoolStats> {
  // This would typically query the database for actual pool statistics
  // For now, return placeholder values
  return {
    activeConnections: 0,
    idleConnections: 0,
    totalConnections: 0,
    waitingRequests: 0,
  }
}
