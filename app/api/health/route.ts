import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import cache from '@/lib/cache';
import { logger, createLoggerFromRequest } from '@/lib/logger';
import { circuitBreaker } from '@/lib/circuit-breaker';
import OpenAI from 'openai';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  components: {
    database: ComponentHealth;
    cache: ComponentHealth;
    openai: ComponentHealth;
    circuitBreaker: ComponentHealth;
  };
  checks: HealthCheck[];
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number;
  details?: any;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  output?: string;
  responseTime?: number;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  
  try {
    // Simple query to check connection
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      message: 'Database connection successful',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    logger.error('Database health check failed', error as Error);
    
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown database error',
      responseTime,
    };
  }
}

/**
 * Check cache status
 */
async function checkCache(): Promise<ComponentHealth> {
  const start = Date.now();
  
  try {
    // Test cache by setting and getting a value
    const testKey = 'health-check-test';
    const testValue = Date.now().toString();
    
    await cache.set(testKey, testValue, 5);
    const retrieved = await cache.get(testKey);
    
    await cache.delete(testKey);
    
    const responseTime = Date.now() - start;
    
    if (retrieved === testValue) {
      return {
        status: 'healthy',
        message: 'Cache operational',
        responseTime,
      };
    } else {
      return {
        status: 'degraded',
        message: 'Cache returned unexpected value',
        responseTime,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - start;
    logger.error('Cache health check failed', error as Error);
    
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown cache error',
      responseTime,
    };
  }
}

/**
 * Check OpenAI API availability
 */
async function checkOpenAI(): Promise<ComponentHealth> {
  const start = Date.now();
  
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return {
        status: 'degraded',
        message: 'OpenAI API key not configured',
        responseTime: Date.now() - start,
      };
    }
    
    const openai = new OpenAI({ apiKey });
    
    // Simple API call to check connectivity
    await openai.models.list({ max_results: 1 });
    
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      message: 'OpenAI API operational',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    logger.error('OpenAI health check failed', error as Error);
    
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown OpenAI error',
      responseTime,
    };
  }
}

/**
 * Check circuit breaker status
 */
async function checkCircuitBreaker(): Promise<ComponentHealth> {
  const start = Date.now();
  
  try {
    // Get circuit breaker state
    const state = circuitBreaker.getState();
    const responseTime = Date.now() - start;
    
    return {
      status: state === 'open' ? 'degraded' : 'healthy',
      message: `Circuit breaker state: ${state}`,
      responseTime,
      details: state,
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    logger.error('Circuit breaker health check failed', error as Error);
    
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown circuit breaker error',
      responseTime,
    };
  }
}

/**
 * Determine overall health status
 */
function determineOverallStatus(components: HealthCheckResult['components']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(components).map(c => c.status);
  
  if (statuses.some(s => s === 'unhealthy')) {
    return 'unhealthy';
  }
  
  if (statuses.some(s => s === 'degraded')) {
    return 'degraded';
  }
  
  return 'healthy';
}

/**
 * GET /health - Basic health check
 */
export async function GET(request: NextRequest) {
  const log = createLoggerFromRequest(request);
  const start = Date.now();
  
  try {
    log.info('Health check requested');
    
    // Run all health checks in parallel
    const [database, cache, openai, circuitBreaker] = await Promise.all([
      checkDatabase(),
      checkCache(),
      checkOpenAI(),
      checkCircuitBreaker(),
    ]);
    
    const components = {
      database,
      cache,
      openai,
      circuitBreaker,
    };
    
    const overallStatus = determineOverallStatus(components);
    const responseTime = Date.now() - start;
    
    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      components,
      checks: [
        {
          name: 'database',
          status: database.status === 'healthy' ? 'pass' : database.status === 'degraded' ? 'warn' : 'fail',
          output: database.message,
          responseTime: database.responseTime,
        },
        {
          name: 'cache',
          status: cache.status === 'healthy' ? 'pass' : cache.status === 'degraded' ? 'warn' : 'fail',
          output: cache.message,
          responseTime: cache.responseTime,
        },
        {
          name: 'openai',
          status: openai.status === 'healthy' ? 'pass' : openai.status === 'degraded' ? 'warn' : 'fail',
          output: openai.message,
          responseTime: openai.responseTime,
        },
        {
          name: 'circuitBreaker',
          status: circuitBreaker.status === 'healthy' ? 'pass' : circuitBreaker.status === 'degraded' ? 'warn' : 'fail',
          output: circuitBreaker.message,
          responseTime: circuitBreaker.responseTime,
        },
      ],
    };
    
    log.info('Health check completed', {
      status: overallStatus,
      responseTime,
    });
    
    // Return appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    const responseTime = Date.now() - start;
    log.error('Health check failed', error as Error, { responseTime });
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

/**
 * HEAD /health - Lightweight health check
 */
export async function HEAD(request: NextRequest) {
  const log = createLoggerFromRequest(request);
  
  try {
    // Quick check - just verify the process is running
    log.debug('Lightweight health check');
    
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    log.error('Lightweight health check failed', error as Error);
    return new NextResponse(null, { status: 503 });
  }
}
