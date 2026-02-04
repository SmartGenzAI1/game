import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import cache from '@/lib/cache';
import { createLoggerFromRequest } from '@/lib/logger';

export interface ReadinessCheckResult {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    database: { status: 'pass' | 'fail'; message?: string };
    cache: { status: 'pass' | 'fail'; message?: string };
  };
}

/**
 * GET /health/ready - Readiness probe
 * Checks if the application is ready to accept traffic
 */
export async function GET(request: NextRequest) {
  const log = createLoggerFromRequest(request);
  const start = Date.now();
  
  try {
    log.info('Readiness check requested');
    
    // Check database connectivity
    let dbStatus: 'pass' | 'fail' = 'pass';
    let dbMessage = 'Database connected';
    
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'fail';
      dbMessage = error instanceof Error ? error.message : 'Database connection failed';
      log.error('Database readiness check failed', error as Error);
    }
    
    // Check cache connectivity
    let cacheStatus: 'pass' | 'fail' = 'pass';
    let cacheMessage = 'Cache operational';
    
    try {
      const testKey = 'readiness-check-test';
      await cache.set(testKey, 'test', 5);
      await cache.delete(testKey);
    } catch (error) {
      cacheStatus = 'fail';
      cacheMessage = error instanceof Error ? error.message : 'Cache connection failed';
      log.error('Cache readiness check failed', error as Error);
    }
    
    const isReady = dbStatus === 'pass' && cacheStatus === 'pass';
    const responseTime = Date.now() - start;
    
    const result: ReadinessCheckResult = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: dbStatus, message: dbMessage },
        cache: { status: cacheStatus, message: cacheMessage },
      },
    };
    
    log.info('Readiness check completed', {
      status: result.status,
      responseTime,
    });
    
    return NextResponse.json(result, { status: isReady ? 200 : 503 });
  } catch (error) {
    const responseTime = Date.now() - start;
    log.error('Readiness check failed', error as Error, { responseTime });
    
    return NextResponse.json(
      {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
