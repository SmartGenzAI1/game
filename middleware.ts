
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextRequest, NextResponse } from 'next/server';
import { createCorrelationId, extractCorrelationId, createLogger } from './lib/logger';
import { recordHttpRequest } from './lib/metrics';

// Create NextAuth middleware
const authMiddleware = NextAuth(authConfig).auth;

// Security middleware wrapper
export default authMiddleware(async (request) => {
    const startTime = Date.now();
    
    // Extract or create correlation ID
    const correlationId = extractCorrelationId(request.headers) || createCorrelationId();
    
    // Create logger with correlation ID
    const logger = createLogger(correlationId);
    
    // Log incoming request
    logger.info('Incoming request', {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown',
    });
    
    // Additional security checks
    const response = NextResponse.next();

    // Add security headers to all responses
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Add correlation ID to response headers
    response.headers.set('X-Correlation-ID', correlationId);

    // Remove sensitive headers
    response.headers.delete('x-powered-by');

    // Record metrics (will be updated by API routes if they override)
    const duration = (Date.now() - startTime) / 1000;
    recordHttpRequest(
        request.method,
        new URL(request.url).pathname,
        response.status,
        duration,
        correlationId
    );

    // Log response
    logger.info('Request completed', {
        status: response.status,
        duration,
    });

    return response;
});

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
