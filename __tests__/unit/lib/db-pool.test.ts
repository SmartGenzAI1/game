import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getConnectionPoolConfig,
  validatePoolConfig,
  getPrismaConnectionUrl,
  getHealthCheckConfig,
  getPoolStats,
} from '@/lib/db-pool';

describe('getConnectionPoolConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return production config when NODE_ENV is production', () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.DB_POOL_MIN = '5';
    process.env.DB_POOL_MAX = '20';
    process.env.DB_CONNECTION_TIMEOUT = '30';
    process.env.DB_POOL_TIMEOUT = '10';

    const config = getConnectionPoolConfig();

    expect(config.minConnections).toBe(5);
    expect(config.maxConnections).toBe(20);
    expect(config.connectionTimeout).toBe(30);
    expect(config.poolTimeout).toBe(10);
    expect(config.logQueries).toBe(false);
  });

  it('should return development config when NODE_ENV is development', () => {
    (process.env as any).NODE_ENV = 'development';

    const config = getConnectionPoolConfig();

    expect(config.minConnections).toBe(2);
    expect(config.maxConnections).toBe(10);
    expect(config.connectionTimeout).toBe(30);
    expect(config.poolTimeout).toBe(10);
    expect(config.logQueries).toBe(true);
  });

  it('should return test config when NODE_ENV is test', () => {
    (process.env as any).NODE_ENV = 'test';

    const config = getConnectionPoolConfig();

    expect(config.minConnections).toBe(1);
    expect(config.maxConnections).toBe(5);
    expect(config.connectionTimeout).toBe(30);
    expect(config.poolTimeout).toBe(10);
    expect(config.logQueries).toBe(false);
  });

  it('should use default values when env vars are not set', () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.DB_POOL_MIN;
    delete process.env.DB_POOL_MAX;
    delete process.env.DB_CONNECTION_TIMEOUT;
    delete process.env.DB_POOL_TIMEOUT;

    const config = getConnectionPoolConfig();

    expect(config.minConnections).toBe(5); // Default
    expect(config.maxConnections).toBe(20); // Default
    expect(config.connectionTimeout).toBe(30); // Default
    expect(config.poolTimeout).toBe(10); // Default
  });
});

describe('validatePoolConfig', () => {
  it('should validate correct config', () => {
    const config = {
      minConnections: 5,
      maxConnections: 20,
      connectionTimeout: 30,
      poolTimeout: 10,
      logQueries: false,
    };

    expect(validatePoolConfig(config)).toBe(true);
  });

  it('should reject negative minConnections', () => {
    const config = {
      minConnections: -1,
      maxConnections: 20,
      connectionTimeout: 30,
      poolTimeout: 10,
      logQueries: false,
    };

    expect(validatePoolConfig(config)).toBe(false);
  });

  it('should reject maxConnections less than minConnections', () => {
    const config = {
      minConnections: 20,
      maxConnections: 10,
      connectionTimeout: 30,
      poolTimeout: 10,
      logQueries: false,
    };

    expect(validatePoolConfig(config)).toBe(false);
  });

  it('should warn about maxConnections > 100', () => {
    const config = {
      minConnections: 5,
      maxConnections: 150,
      connectionTimeout: 30,
      poolTimeout: 10,
      logQueries: false,
    };

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    validatePoolConfig(config);
    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it('should reject connectionTimeout < 1', () => {
    const config = {
      minConnections: 5,
      maxConnections: 20,
      connectionTimeout: 0,
      poolTimeout: 10,
      logQueries: false,
    };

    expect(validatePoolConfig(config)).toBe(false);
  });

  it('should reject poolTimeout < 1', () => {
    const config = {
      minConnections: 5,
      maxConnections: 20,
      connectionTimeout: 30,
      poolTimeout: 0,
      logQueries: false,
    };

    expect(validatePoolConfig(config)).toBe(false);
  });

  it('should accept zero minConnections', () => {
    const config = {
      minConnections: 0,
      maxConnections: 20,
      connectionTimeout: 30,
      poolTimeout: 10,
      logQueries: false,
    };

    expect(validatePoolConfig(config)).toBe(true);
  });

  it('should accept equal min and max connections', () => {
    const config = {
      minConnections: 10,
      maxConnections: 10,
      connectionTimeout: 30,
      poolTimeout: 10,
      logQueries: false,
    };

    expect(validatePoolConfig(config)).toBe(true);
  });
});

describe('getPrismaConnectionUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error if DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;

    expect(() => getPrismaConnectionUrl()).toThrow('DATABASE_URL environment variable is required');
  });

  it('should add pool parameters to URL', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.DB_POOL_MAX = '20';
    process.env.DB_POOL_TIMEOUT = '10';

    const url = getPrismaConnectionUrl();

    expect(url).toContain('connection_limit=20');
    expect(url).toContain('pool_timeout=10');
  });

  it('should preserve existing URL parameters', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db?schema=public';
    process.env.DB_POOL_MAX = '20';
    process.env.DB_POOL_TIMEOUT = '10';

    const url = getPrismaConnectionUrl();

    expect(url).toContain('schema=public');
    expect(url).toContain('connection_limit=20');
    expect(url).toContain('pool_timeout=10');
  });

  it('should handle URLs with existing parameters', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.DB_POOL_MAX = '15';
    process.env.DB_POOL_TIMEOUT = '5';

    const url = getPrismaConnectionUrl();

    expect(url).toContain('connection_limit=15');
    expect(url).toContain('pool_timeout=5');
  });
});

describe('getHealthCheckConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return default config when env vars are not set', () => {
    delete process.env.DB_HEALTH_CHECK_ENABLED;
    delete process.env.DB_HEALTH_CHECK_INTERVAL;
    delete process.env.DB_HEALTH_CHECK_TIMEOUT;
    delete process.env.DB_HEALTH_CHECK_RETRIES;

    const config = getHealthCheckConfig();

    expect(config.enabled).toBe(true);
    expect(config.interval).toBe(60);
    expect(config.timeout).toBe(5);
    expect(config.retries).toBe(3);
  });

  it('should use custom values from env vars', () => {
    process.env.DB_HEALTH_CHECK_ENABLED = 'false';
    process.env.DB_HEALTH_CHECK_INTERVAL = '120';
    process.env.DB_HEALTH_CHECK_TIMEOUT = '10';
    process.env.DB_HEALTH_CHECK_RETRIES = '5';

    const config = getHealthCheckConfig();

    expect(config.enabled).toBe(false);
    expect(config.interval).toBe(120);
    expect(config.timeout).toBe(10);
    expect(config.retries).toBe(5);
  });

  it('should parse numeric values correctly', () => {
    process.env.DB_HEALTH_CHECK_INTERVAL = '90';
    process.env.DB_HEALTH_CHECK_TIMEOUT = '8';
    process.env.DB_HEALTH_CHECK_RETRIES = '4';

    const config = getHealthCheckConfig();

    expect(config.interval).toBe(90);
    expect(config.timeout).toBe(8);
    expect(config.retries).toBe(4);
  });
});

describe('getPoolStats', () => {
  it('should return pool stats', async () => {
    const stats = await getPoolStats();

    expect(stats).toHaveProperty('activeConnections');
    expect(stats).toHaveProperty('idleConnections');
    expect(stats).toHaveProperty('totalConnections');
    expect(stats).toHaveProperty('waitingRequests');
  });

  it('should return zero values for placeholder implementation', async () => {
    const stats = await getPoolStats();

    expect(stats.activeConnections).toBe(0);
    expect(stats.idleConnections).toBe(0);
    expect(stats.totalConnections).toBe(0);
    expect(stats.waitingRequests).toBe(0);
  });
});

describe('Connection Pool Configuration Types', () => {
  it('should have correct type structure', () => {
    const config = getConnectionPoolConfig();

    expect(typeof config.minConnections).toBe('number');
    expect(typeof config.maxConnections).toBe('number');
    expect(typeof config.connectionTimeout).toBe('number');
    expect(typeof config.poolTimeout).toBe('number');
    expect(typeof config.logQueries).toBe('boolean');
  });

  it('should have correct health check type structure', () => {
    const config = getHealthCheckConfig();

    expect(typeof config.enabled).toBe('boolean');
    expect(typeof config.interval).toBe('number');
    expect(typeof config.timeout).toBe('number');
    expect(typeof config.retries).toBe('number');
  });

  it('should have correct pool stats type structure', async () => {
    const stats = await getPoolStats();

    expect(typeof stats.activeConnections).toBe('number');
    expect(typeof stats.idleConnections).toBe('number');
    expect(typeof stats.totalConnections).toBe('number');
    expect(typeof stats.waitingRequests).toBe('number');
  });
});
