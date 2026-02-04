import { NextRequest, NextResponse } from 'next/server';
import { createLoggerFromRequest } from '@/lib/logger';

export interface LivenessCheckResult {
  status: 'alive' | 'dead';
  timestamp: string;
  uptime: number;
  pid: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

/**
 * GET /health/live - Liveness probe
 * Checks if the application process is running
 */
export async function GET(request: NextRequest) {
  const log = createLoggerFromRequest(request);
  
  try {
    log.debug('Liveness check requested');
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    const result: LivenessCheckResult = {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
    };
    
    log.debug('Liveness check completed', {
      status: result.status,
      uptime: result.uptime,
    });
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    log.error('Liveness check failed', error as Error);
    
    return NextResponse.json(
      {
        status: 'dead',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
