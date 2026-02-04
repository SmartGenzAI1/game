import { NextRequest } from 'next/server';

// In-memory rate limiter for development and small-scale production
// For production, consider using Redis or a dedicated rate limiting service like Upstash

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (IP address, user ID, etc.)
   * @param maxRequests - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with success status and remaining requests
   */
  check(identifier: string, maxRequests: number, windowMs: number): {
    success: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.store.set(identifier, newEntry);
      return {
        success: true,
        remaining: maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Increment count
    entry.count += 1;
    this.store.set(identifier, entry);

    const remaining = Math.max(0, maxRequests - entry.count);
    return {
      success: entry.count <= maxRequests,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   * @param identifier - Unique identifier to reset
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Get current rate limit status for an identifier
   * @param identifier - Unique identifier
   * @returns Current rate limit entry or undefined
   */
  getStatus(identifier: string): RateLimitEntry | undefined {
    return this.store.get(identifier);
  }

  /**
   * Destroy the rate limiter and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Create singleton instances for different rate limit scenarios

// Login rate limiter: 5 attempts per 15 minutes per IP
export const loginRateLimiter = new RateLimiter();
export const LOGIN_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// Signup rate limiter: 3 attempts per hour per IP
export const signupRateLimiter = new RateLimiter();
export const SIGNUP_RATE_LIMIT = {
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
};

// API rate limiter: 100 requests per minute per IP
export const apiRateLimiter = new RateLimiter();
export const API_RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
};

// Link click rate limiter: 10 clicks per second per IP (prevent abuse)
export const clickRateLimiter = new RateLimiter();
export const CLICK_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 1000, // 1 second
};

/**
 * Get client IP address from request
 * @param request - Next.js request object
 * @returns IP address string
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default if no IP found
  return 'unknown';
}

/**
 * Check rate limit and return appropriate response if exceeded
 * @param request - Next.js request object
 * @param limiter - Rate limiter instance
 * @param limit - Rate limit configuration
 * @returns Response object if rate limited, null otherwise
 */
export function checkRateLimit(
  request: NextRequest,
  limiter: RateLimiter,
  limit: { maxRequests: number; windowMs: number }
): Response | null {
  const ip = getClientIp(request);
  const result = limiter.check(ip, limit.maxRequests, limit.windowMs);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Add rate limit headers to response
 * @param response - Response object
 * @param remaining - Remaining requests
 * @param limit - Maximum requests
 * @param resetTime - Reset time timestamp
 */
export function addRateLimitHeaders(
  response: Response,
  remaining: number,
  limit: number,
  resetTime: number
): void {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
}
