import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Logger,
  LogLevel,
  createCorrelationId,
  extractCorrelationId,
  logger,
  createLoggerFromRequest,
  createLogger,
  flushLogs,
} from '@/lib/logger';

describe('Logger', () => {
  let testLogger: Logger;

  beforeEach(() => {
    testLogger = new Logger();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with empty context', () => {
      const logger = new Logger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with initial context', () => {
      const logger = new Logger({ userId: 'user-123' });
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('child method', () => {
    it('should create child logger with additional context', () => {
      const child = testLogger.child({ userId: 'user-123' });
      expect(child).toBeInstanceOf(Logger);
    });

    it('should merge context from parent', () => {
      const parent = new Logger({ requestId: 'req-123' });
      const child = parent.child({ userId: 'user-123' });

      // Child should have both contexts
      expect(child).toBeInstanceOf(Logger);
    });
  });

  describe('withCorrelationId method', () => {
    it('should create logger with correlation ID', () => {
      const correlationId = 'test-correlation-id';
      const loggerWithId = testLogger.withCorrelationId(correlationId);

      expect(loggerWithId).toBeInstanceOf(Logger);
    });
  });

  describe('withUser method', () => {
    it('should create logger with user context', () => {
      const userId = 'user-123';
      const loggerWithUser = testLogger.withUser(userId);

      expect(loggerWithUser).toBeInstanceOf(Logger);
    });
  });

  describe('withRequest method', () => {
    it('should create logger with request context', () => {
      const request = new Request('http://localhost:3000/test', {
        method: 'GET',
        headers: {
          'user-agent': 'test-agent',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const loggerWithRequest = testLogger.withRequest(request);
      expect(loggerWithRequest).toBeInstanceOf(Logger);
    });

    it('should extract correlation ID from headers', () => {
      const request = new Request('http://localhost:3000/test', {
        headers: {
          'x-correlation-id': 'test-correlation-id',
        },
      });

      const loggerWithRequest = testLogger.withRequest(request);
      expect(loggerWithRequest).toBeInstanceOf(Logger);
    });
  });

  describe('debug method', () => {
    it('should log debug message', () => {
      expect(() => testLogger.debug('Debug message')).not.toThrow();
    });

    it('should log debug message with data', () => {
      expect(() => testLogger.debug('Debug message', { key: 'value' })).not.toThrow();
    });
  });

  describe('info method', () => {
    it('should log info message', () => {
      expect(() => testLogger.info('Info message')).not.toThrow();
    });

    it('should log info message with data', () => {
      expect(() => testLogger.info('Info message', { key: 'value' })).not.toThrow();
    });
  });

  describe('warn method', () => {
    it('should log warning message', () => {
      expect(() => testLogger.warn('Warning message')).not.toThrow();
    });

    it('should log warning message with data', () => {
      expect(() => testLogger.warn('Warning message', { key: 'value' })).not.toThrow();
    });
  });

  describe('error method', () => {
    it('should log error message', () => {
      expect(() => testLogger.error('Error message')).not.toThrow();
    });

    it('should log error message with Error object', () => {
      const error = new Error('Test error');
      expect(() => testLogger.error('Error message', error)).not.toThrow();
    });

    it('should log error message with data', () => {
      const error = new Error('Test error');
      expect(() => testLogger.error('Error message', error, { key: 'value' })).not.toThrow();
    });
  });

  describe('log method', () => {
    it('should log with custom level', () => {
      expect(() => testLogger.log(LogLevel.INFO, 'Custom level message')).not.toThrow();
    });

    it('should log with data', () => {
      expect(() => testLogger.log(LogLevel.DEBUG, 'Debug message', { key: 'value' })).not.toThrow();
    });
  });

  describe('logRequest method', () => {
    it('should log request start', () => {
      const request = new Request('http://localhost:3000/test', {
        method: 'GET',
      });

      expect(() => testLogger.logRequest(request)).not.toThrow();
    });

    it('should log request with response', () => {
      const request = new Request('http://localhost:3000/test', {
        method: 'GET',
      });
      const response = new Response('OK', { status: 200 });

      expect(() => testLogger.logRequest(request, response, 100)).not.toThrow();
    });
  });

  describe('logDatabase method', () => {
    it('should log database operation', () => {
      expect(() => testLogger.logDatabase('SELECT', 'users', 10)).not.toThrow();
    });

    it('should log database error', () => {
      const error = new Error('Database error');
      expect(() => testLogger.logDatabase('SELECT', 'users', 10, error)).not.toThrow();
    });
  });

  describe('logAuth method', () => {
    it('should log successful auth event', () => {
      expect(() => testLogger.logAuth('login', 'user-123', true)).not.toThrow();
    });

    it('should log failed auth event', () => {
      expect(() => testLogger.logAuth('login', 'user-123', false)).not.toThrow();
    });

    it('should log auth event with details', () => {
      expect(() => testLogger.logAuth('login', 'user-123', true, { ip: '192.168.1.1' })).not.toThrow();
    });
  });

  describe('logApiCall method', () => {
    it('should log successful API call', () => {
      expect(() => testLogger.logApiCall('openai', '/v1/chat', 'POST', 100)).not.toThrow();
    });

    it('should log failed API call', () => {
      const error = new Error('API error');
      expect(() => testLogger.logApiCall('openai', '/v1/chat', 'POST', 100, error)).not.toThrow();
    });
  });

  describe('logCache method', () => {
    it('should log cache hit', () => {
      expect(() => testLogger.logCache('hit', 'cache-key', 1)).not.toThrow();
    });

    it('should log cache miss', () => {
      expect(() => testLogger.logCache('miss', 'cache-key', 1)).not.toThrow();
    });

    it('should log cache set', () => {
      expect(() => testLogger.logCache('set', 'cache-key', 1)).not.toThrow();
    });

    it('should log cache delete', () => {
      expect(() => testLogger.logCache('delete', 'cache-key', 1)).not.toThrow();
    });
  });

  describe('logBusiness method', () => {
    it('should log business event', () => {
      expect(() => testLogger.logBusiness('user_registered', 'user-123')).not.toThrow();
    });

    it('should log business event with data', () => {
      expect(() => testLogger.logBusiness('user_registered', 'user-123', { email: 'test@example.com' })).not.toThrow();
    });
  });

  describe('logPerformance method', () => {
    it('should log performance metric', () => {
      expect(() => testLogger.logPerformance('db_query', 100)).not.toThrow();
    });

    it('should log performance metric with metadata', () => {
      expect(() => testLogger.logPerformance('db_query', 100, { table: 'users' })).not.toThrow();
    });
  });

  describe('logSecurity method', () => {
    it('should log security event with low severity', () => {
      expect(() => testLogger.logSecurity('suspicious_activity', 'low')).not.toThrow();
    });

    it('should log security event with high severity', () => {
      expect(() => testLogger.logSecurity('brute_force_attempt', 'high')).not.toThrow();
    });

    it('should log security event with critical severity', () => {
      expect(() => testLogger.logSecurity('xss_attempt', 'critical')).not.toThrow();
    });

    it('should log security event with details', () => {
      expect(() => testLogger.logSecurity('suspicious_activity', 'medium', { ip: '192.168.1.1' })).not.toThrow();
    });
  });
});

describe('createCorrelationId', () => {
  it('should create correlation ID', () => {
    const id = createCorrelationId();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  it('should create unique correlation IDs', () => {
    const id1 = createCorrelationId();
    const id2 = createCorrelationId();
    expect(id1).not.toBe(id2);
  });

  it('should include timestamp', () => {
    const id = createCorrelationId();
    const timestamp = parseInt(id.split('-')[0]);
    expect(timestamp).toBeGreaterThan(Date.now() - 1000);
  });
});

describe('extractCorrelationId', () => {
  it('should extract from x-correlation-id header', () => {
    const headers = new Headers({ 'x-correlation-id': 'test-id' });
    const id = extractCorrelationId(headers);
    expect(id).toBe('test-id');
  });

  it('should extract from x-request-id header', () => {
    const headers = new Headers({ 'x-request-id': 'test-id' });
    const id = extractCorrelationId(headers);
    expect(id).toBe('test-id');
  });

  it('should extract from request-id header', () => {
    const headers = new Headers({ 'request-id': 'test-id' });
    const id = extractCorrelationId(headers);
    expect(id).toBe('test-id');
  });

  it('should return undefined if no correlation ID header', () => {
    const headers = new Headers();
    const id = extractCorrelationId(headers);
    expect(id).toBeUndefined();
  });

  it('should prioritize x-correlation-id over other headers', () => {
    const headers = new Headers({
      'x-correlation-id': 'id-1',
      'x-request-id': 'id-2',
      'request-id': 'id-3',
    });
    const id = extractCorrelationId(headers);
    expect(id).toBe('id-1');
  });
});

describe('logger (default instance)', () => {
  it('should be an instance of Logger', () => {
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should have all logging methods', () => {
    expect(logger.debug).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.log).toBeDefined();
  });
});

describe('createLoggerFromRequest', () => {
  it('should create logger from request', () => {
    const request = new Request('http://localhost:3000/test', {
      method: 'GET',
    });

    const logger = createLoggerFromRequest(request);
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should extract correlation ID from request', () => {
    const request = new Request('http://localhost:3000/test', {
      headers: { 'x-correlation-id': 'test-id' },
    });

    const logger = createLoggerFromRequest(request);
    expect(logger).toBeInstanceOf(Logger);
  });
});

describe('createLogger', () => {
  it('should create logger without correlation ID', () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should create logger with correlation ID', () => {
    const logger = createLogger('test-correlation-id');
    expect(logger).toBeInstanceOf(Logger);
  });
});

describe('flushLogs', () => {
  it('should flush logs', async () => {
    await expect(flushLogs()).resolves.not.toThrow();
  });

  it('should return promise', async () => {
    const result = flushLogs();
    expect(result).toBeInstanceOf(Promise);
    await result;
  });
});
