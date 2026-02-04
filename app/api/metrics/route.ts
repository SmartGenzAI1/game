import { NextRequest, NextResponse } from 'next/server';
import { getMetrics } from '@/lib/metrics';
import { createLoggerFromRequest } from '@/lib/logger';

/**
 * GET /metrics - Prometheus metrics endpoint
 * Returns application metrics in Prometheus format
 */
export async function GET(request: NextRequest) {
  const log = createLoggerFromRequest(request);
  
  try {
    log.info('Metrics requested');
    
    // Check if metrics are enabled
    if (process.env.ENABLE_METRICS === 'false') {
      log.warn('Metrics endpoint disabled');
      return NextResponse.json(
        { error: 'Metrics endpoint is disabled' },
        { status: 403 }
      );
    }
    
    // Get metrics in Prometheus format
    const metrics = await getMetrics();
    
    log.info('Metrics retrieved successfully', {
      size: metrics.length,
    });
    
    // Return metrics as plain text
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  } catch (error) {
    log.error('Failed to retrieve metrics', error as Error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

/**
 * HEAD /metrics - Check if metrics endpoint is available
 */
export async function HEAD(request: NextRequest) {
  const log = createLoggerFromRequest(request);
  
  try {
    if (process.env.ENABLE_METRICS === 'false') {
      return new NextResponse(null, { status: 403 });
    }
    
    log.debug('Metrics endpoint health check');
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    log.error('Metrics endpoint health check failed', error as Error);
    return new NextResponse(null, { status: 500 });
  }
}
