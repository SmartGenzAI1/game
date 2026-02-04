import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  loginRateLimiter,
  LOGIN_RATE_LIMIT,
  signupRateLimiter,
  SIGNUP_RATE_LIMIT,
  apiRateLimiter,
  API_RATE_LIMIT,
  clickRateLimiter,
  CLICK_RATE_LIMIT,
  getClientIp,
  checkRateLimit,
  addRateLimitHeaders,
} from '@/lib/rate-limit';

describe('RateLimiter', () => {
  beforeEach(() => {
    // Clear all rate limiters before each test
    loginRateLimiter.reset('test-ip');
    signupRateLimiter.reset('test-ip');
    apiRateLimiter.reset('test-ip');
    clickRateLimiter.reset('test-ip');
  });

  describe('check method', () => {
    it('should allow first request', () => {
      const result = loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(LOGIN_RATE_LIMIT.maxRequests - 1);
    });

    it('should allow requests within limit', () => {
      for (let i = 0; i < LOGIN_RATE_LIMIT.maxRequests; i++) {
        const result = loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);
        expect(result.success).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      // Make maxRequests + 1 requests
      for (let i = 0; i < LOGIN_RATE_LIMIT.maxRequests; i++) {
        loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);
      }

      const result = loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      // Make maxRequests
      for (let i = 0; i < LOGIN_RATE_LIMIT.maxRequests; i++) {
        loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, 100); // 100ms window
      }

      // Should be blocked
      let result = loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, 100);
      expect(result.success).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      result = loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, 100);
      expect(result.success).toBe(true);
    });

    it('should track different identifiers separately', () => {
      const result1 = loginRateLimiter.check('ip-1', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);
      const result2 = loginRateLimiter.check('ip-2', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should return correct reset time', () => {
      const result = loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);
      const now = Date.now();
      expect(result.resetTime).toBeGreaterThan(now);
      expect(result.resetTime).toBeLessThanOrEqual(now + LOGIN_RATE_LIMIT.windowMs);
    });
  });

  describe('reset method', () => {
    it('should reset rate limit for identifier', () => {
      // Make maxRequests
      for (let i = 0; i < LOGIN_RATE_LIMIT.maxRequests; i++) {
        loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);
      }

      // Should be blocked
      let result = loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);
      expect(result.success).toBe(false);

      // Reset
      loginRateLimiter.reset('test-ip');

      // Should be allowed again
      result = loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);
      expect(result.success).toBe(true);
    });
  });

  describe('getStatus method', () => {
    it('should return undefined for non-existent identifier', () => {
      const status = loginRateLimiter.getStatus('non-existent-ip');
      expect(status).toBeUndefined();
    });

    it('should return status for existing identifier', () => {
      loginRateLimiter.check('test-ip', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);
      const status = loginRateLimiter.getStatus('test-ip');
      expect(status).toBeDefined();
      expect(status?.count).toBe(1);
    });
  });

  describe('destroy method', () => {
    it('should clear all entries', () => {
      loginRateLimiter.check('ip-1', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);
      loginRateLimiter.check('ip-2', LOGIN_RATE_LIMIT.maxRequests, LOGIN_RATE_LIMIT.windowMs);

      loginRateLimiter.destroy();

      expect(loginRateLimiter.getStatus('ip-1')).toBeUndefined();
      expect(loginRateLimiter.getStatus('ip-2')).toBeUndefined();
    });
  });
});

describe('getClientIp', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const request = new NextRequest('http://localhost:3000', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    expect(getClientIp(request)).toBe('192.168.1.1');
  });

  it('should take first IP from x-forwarded-for', () => {
    const request = new NextRequest('http://localhost:3000', {
      headers: { 'x-forwarded-for': '192.168.1.1, 192.168.1.2' },
    });
    expect(getClientIp(request)).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header', () => {
    const request = new NextRequest('http://localhost:3000', {
      headers: { 'x-real-ip': '192.168.1.1' },
    });
    expect(getClientIp(request)).toBe('192.168.1.1');
  });

  it('should extract IP from cf-connecting-ip header', () => {
    const request = new NextRequest('http://localhost:3000', {
      headers: { 'cf-connecting-ip': '192.168.1.1' },
    });
    expect(getClientIp(request)).toBe('192.168.1.1');
  });

  it('should prioritize x-forwarded-for over other headers', () => {
    const request = new NextRequest('http://localhost:3000', {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2',
        'cf-connecting-ip': '192.168.1.3',
      },
    });
    expect(getClientIp(request)).toBe('192.168.1.1');
  });

  it('should return unknown if no IP headers present', () => {
    const request = new NextRequest('http://localhost:3000');
    expect(getClientIp(request)).toBe('unknown');
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    loginRateLimiter.reset('test-ip');
  });

  it('should return null if request is allowed', () => {
    const request = new NextRequest('http://localhost:3000', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });

    const response = checkRateLimit(request, loginRateLimiter, LOGIN_RATE_LIMIT);
    expect(response).toBeNull();
  });

  it('should return 429 response if rate limited', () => {
    const request = new NextRequest('http://localhost:3000', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });

    // Exhaust rate limit
    for (let i = 0; i < LOGIN_RATE_LIMIT.maxRequests; i++) {
      checkRateLimit(request, loginRateLimiter, LOGIN_RATE_LIMIT);
    }

    const response = checkRateLimit(request, loginRateLimiter, LOGIN_RATE_LIMIT);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);
  });

  it('should include rate limit headers in 429 response', () => {
    const request = new NextRequest('http://localhost:3000', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });

    // Exhaust rate limit
    for (let i = 0; i < LOGIN_RATE_LIMIT.maxRequests; i++) {
      checkRateLimit(request, loginRateLimiter, LOGIN_RATE_LIMIT);
    }

    const response = checkRateLimit(request, loginRateLimiter, LOGIN_RATE_LIMIT);
    expect(response?.headers.get('X-RateLimit-Limit')).toBe(LOGIN_RATE_LIMIT.maxRequests.toString());
    expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response?.headers.get('Retry-After')).toBeDefined();
  });

  it('should return JSON error message in 429 response', async () => {
    const request = new NextRequest('http://localhost:3000', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });

    // Exhaust rate limit
    for (let i = 0; i < LOGIN_RATE_LIMIT.maxRequests; i++) {
      checkRateLimit(request, loginRateLimiter, LOGIN_RATE_LIMIT);
    }

    const response = checkRateLimit(request, loginRateLimiter, LOGIN_RATE_LIMIT);
    const body = await response?.json();
    expect(body).toHaveProperty('error', 'Too many requests');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('retryAfter');
  });
});

describe('addRateLimitHeaders', () => {
  it('should add rate limit headers to response', () => {
    const response = new Response('OK');
    addRateLimitHeaders(response, 5, 10, Date.now() + 60000);

    expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('5');
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  it('should format reset time as ISO string', () => {
    const response = new Response('OK');
    const resetTime = Date.now() + 60000;
    addRateLimitHeaders(response, 5, 10, resetTime);

    const resetHeader = response.headers.get('X-RateLimit-Reset');
    expect(resetHeader).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('Rate limit configurations', () => {
  it('should have correct login rate limit config', () => {
    expect(LOGIN_RATE_LIMIT.maxRequests).toBe(5);
    expect(LOGIN_RATE_LIMIT.windowMs).toBe(15 * 60 * 1000); // 15 minutes
  });

  it('should have correct signup rate limit config', () => {
    expect(SIGNUP_RATE_LIMIT.maxRequests).toBe(3);
    expect(SIGNUP_RATE_LIMIT.windowMs).toBe(60 * 60 * 1000); // 1 hour
  });

  it('should have correct API rate limit config', () => {
    expect(API_RATE_LIMIT.maxRequests).toBe(100);
    expect(API_RATE_LIMIT.windowMs).toBe(60 * 1000); // 1 minute
  });

  it('should have correct click rate limit config', () => {
    expect(CLICK_RATE_LIMIT.maxRequests).toBe(10);
    expect(CLICK_RATE_LIMIT.windowMs).toBe(1000); // 1 second
  });
});

describe('Rate limiter cleanup', () => {
  it('should clean up expired entries', async () => {
    const limiter = loginRateLimiter;
    
    // Add entry with short window
    limiter.check('test-ip', 5, 100);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Entry should be cleaned up
    const status = limiter.getStatus('test-ip');
    expect(status).toBeUndefined();
  });
});
