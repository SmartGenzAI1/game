import pino from 'pino';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp?: string;
  duration?: number;
}

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credit[_-]?card/i,
  /ssn/i,
  /pin/i,
];

/**
 * Redact sensitive data from log entries
 */
function redactSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
    redacted[key] = isSensitive ? '[REDACTED]' : redactSensitiveData(value);
  }
  return redacted;
}

/**
 * Create a correlation ID for request tracing
 */
export function createCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Extract correlation ID from headers
 */
export function extractCorrelationId(headers: Headers): string | undefined {
  return headers.get('x-correlation-id') || 
         headers.get('x-request-id') || 
         headers.get('request-id') || 
         undefined;
}

/**
 * Logger configuration
 */
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    error: pino.stdSerializers.err,
  },
  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.body.password',
      'req.body.token',
      'req.body.secret',
      'req.body.apiKey',
      'req.body.api_key',
      'req.body.creditCard',
      'req.body.ssn',
      'req.body.pin',
    ],
    remove: true,
  },
};

// Create base logger
const baseLogger = pino(
  loggerConfig,
  pino.multistream([
    {
      level: 'trace',
      stream: process.stdout,
    },
  ])
);

/**
 * Structured Logger class
 */
export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Create a logger with correlation ID
   */
  withCorrelationId(correlationId: string): Logger {
    return this.child({ correlationId });
  }

  /**
   * Create a logger with user context
   */
  withUser(userId: string): Logger {
    return this.child({ userId });
  }

  /**
   * Create a logger with request context
   */
  withRequest(request: Request): Logger {
    const headers = request.headers;
    const correlationId = extractCorrelationId(headers) || createCorrelationId();
    
    return this.child({
      correlationId,
      requestId: correlationId,
      method: request.method,
      path: request.url,
      userAgent: headers.get('user-agent') || undefined,
      ip: headers.get('x-forwarded-for') || 
          headers.get('x-real-ip') || 
          'unknown',
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    const logData = data ? redactSensitiveData(data) : undefined;
    baseLogger.debug(
      {
        ...this.context,
        ...logData,
      },
      message
    );
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    const logData = data ? redactSensitiveData(data) : undefined;
    baseLogger.info(
      {
        ...this.context,
        ...logData,
      },
      message
    );
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    const logData = data ? redactSensitiveData(data) : undefined;
    baseLogger.warn(
      {
        ...this.context,
        ...logData,
      },
      message
    );
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, data?: any): void {
    const logData = data ? redactSensitiveData(data) : undefined;
    const errorData = error instanceof Error ? { err: error } : { error };
    
    baseLogger.error(
      {
        ...this.context,
        ...errorData,
        ...logData,
      },
      message
    );
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, data?: any): void {
    const logData = data ? redactSensitiveData(data) : undefined;
    baseLogger[level](
      {
        ...this.context,
        ...logData,
      },
      message
    );
  }

  /**
   * Log HTTP request
   */
  logRequest(request: Request, response?: Response, duration?: number): void {
    const logger = this.withRequest(request);
    
    const requestData = {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    };

    if (response) {
      logger.info('HTTP request completed', {
        request: requestData,
        response: {
          status: response.status,
          statusText: response.statusText,
        },
        duration,
      });
    } else {
      logger.info('HTTP request started', {
        request: requestData,
      });
    }
  }

  /**
   * Log database operation
   */
  logDatabase(operation: string, table: string, duration?: number, error?: Error): void {
    const logData: any = {
      operation,
      table,
      duration,
    };

    if (error) {
      this.error(`Database operation failed: ${operation}`, error, logData);
    } else {
      this.debug(`Database operation: ${operation}`, logData);
    }
  }

  /**
   * Log authentication event
   */
  logAuth(event: string, userId?: string, success: boolean = true, details?: any): void {
    const logger = userId ? this.withUser(userId) : this;
    
    const logData = {
      event,
      success,
      ...details,
    };

    if (success) {
      logger.info(`Authentication event: ${event}`, logData);
    } else {
      logger.warn(`Authentication failed: ${event}`, logData);
    }
  }

  /**
   * Log API call to external service
   */
  logApiCall(service: string, endpoint: string, method: string, duration?: number, error?: Error): void {
    const logData: any = {
      service,
      endpoint,
      method,
      duration,
    };

    if (error) {
      this.error(`External API call failed: ${service}`, error, logData);
    } else {
      this.info(`External API call: ${service}`, logData);
    }
  }

  /**
   * Log cache operation
   */
  logCache(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, duration?: number): void {
    this.debug(`Cache ${operation}`, {
      key,
      duration,
    });
  }

  /**
   * Log business event
   */
  logBusiness(event: string, userId?: string, data?: any): void {
    const logger = userId ? this.withUser(userId) : this;
    logger.info(`Business event: ${event}`, data);
  }

  /**
   * Log performance metric
   */
  logPerformance(operation: string, duration: number, metadata?: any): void {
    this.info(`Performance: ${operation}`, {
      duration,
      ...metadata,
    });
  }

  /**
   * Log security event
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    this.log(level, `Security event: ${event}`, {
      severity,
      ...details,
    });
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with correlation ID from headers
 */
export function createLoggerFromRequest(request: Request): Logger {
  return logger.withRequest(request);
}

/**
 * Create a logger with correlation ID
 */
export function createLogger(correlationId?: string): Logger {
  return correlationId ? logger.withCorrelationId(correlationId) : logger;
}

/**
 * Flush any pending logs (for graceful shutdown)
 */
export async function flushLogs(): Promise<void> {
  // Pino automatically flushes, but we can add any cleanup here
  return new Promise((resolve) => {
    // Wait for any async log operations to complete
    setTimeout(resolve, 100);
  });
}
